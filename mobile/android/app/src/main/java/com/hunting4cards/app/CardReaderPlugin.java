package com.hunting4cards.app;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Base64;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.Text;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;

/**
 * Reads text in a picture with the phone's own text recognition (ML Kit, on the
 * phone itself: fast, offline and free). The card scanner on the website sends it
 * the strip with the card code as a JPEG, see components/Scanner.tsx.
 */
@CapacitorPlugin(name = "CardReader")
public class CardReaderPlugin extends Plugin {
    private TextRecognizer recognizer;

    @Override
    public void load() {
        recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);
    }

    /** { image: base64 JPEG or PNG, with or without "data:" prefix } → { text, lines: [{ text, x, y }] } */
    @PluginMethod
    public void read(PluginCall call) {
        String image = call.getString("image");
        if (image == null) {
            call.reject("No image");
            return;
        }
        int comma = image.indexOf(',');
        if (image.startsWith("data:") && comma >= 0) image = image.substring(comma + 1);
        byte[] bytes = Base64.decode(image, Base64.DEFAULT);
        Bitmap bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
        if (bitmap == null) {
            call.reject("Not an image");
            return;
        }
        recognizer.process(InputImage.fromBitmap(bitmap, 0))
            .addOnSuccessListener(result -> {
                JSArray lines = new JSArray();
                for (Text.TextBlock block : result.getTextBlocks()) {
                    for (Text.Line line : block.getLines()) {
                        JSObject l = new JSObject();
                        l.put("text", line.getText());
                        if (line.getBoundingBox() != null) {
                            l.put("x", line.getBoundingBox().left);
                            l.put("y", line.getBoundingBox().top);
                        }
                        lines.put(l);
                    }
                }
                JSObject ret = new JSObject();
                ret.put("text", result.getText());
                ret.put("lines", lines);
                call.resolve(ret);
            })
            .addOnFailureListener(e -> call.reject(e.getMessage()));
    }
}
