package com.hunting4cards.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Our own plugin (not from npm), so it is registered here.
        registerPlugin(CardReaderPlugin.class);
        super.onCreate(savedInstanceState);
        openLink(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        openLink(intent);
    }

    // A login link from the email (https://www.hunting4cards.com/account?token_hash=…)
    // opened the app: show that page, which finishes the login.
    private void openLink(Intent intent) {
        if (intent == null || !Intent.ACTION_VIEW.equals(intent.getAction())) return;
        Uri uri = intent.getData();
        if (uri == null || !"https".equals(uri.getScheme())) return;
        String url = uri.toString().replace("://hunting4cards.com", "://www.hunting4cards.com");
        if (getBridge() != null) getBridge().getWebView().post(() -> getBridge().getWebView().loadUrl(url));
    }
}
