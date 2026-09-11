package io.github.dane.rapportstage;

import com.getcapacitor.BridgeActivity;
import android.webkit.WebSettings;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(PrintPlugin.class);
        super.onCreate(savedInstanceState);

        // Allow pinch-to-zoom in the preview — Capacitor disables it by default.
        WebSettings settings = getBridge().getWebView().getSettings();
        settings.setSupportZoom(true);
        settings.setBuiltInZoomControls(true);
        settings.setDisplayZoomControls(false); // hide the ugly +/- overlay buttons
    }
}
