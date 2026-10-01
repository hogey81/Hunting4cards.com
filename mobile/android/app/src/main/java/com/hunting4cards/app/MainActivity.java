package com.hunting4cards.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Our own plugin (not from npm), so it is registered here.
        registerPlugin(CardReaderPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
