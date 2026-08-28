package io.github.dane.rapportstage;

import android.app.Activity;
import android.content.Context;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.webkit.WebView;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativePrint")
public class PrintPlugin extends Plugin {
    @PluginMethod
    public void print(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Le service d'impression est indisponible sur cet appareil.");
            return;
        }

        activity.runOnUiThread(() -> {
            try {
                WebView webView = getBridge().getWebView();
                PrintManager printManager = (PrintManager) getContext().getSystemService(Context.PRINT_SERVICE);

                if (webView == null || printManager == null) {
                    call.reject("Le service d'impression est indisponible sur cet appareil.");
                    return;
                }

                String title = call.getString("title", "Rapport de stage");
                String jobName = title == null || title.trim().isEmpty() ? "Rapport de stage" : title.trim();
                PrintAttributes attributes = new PrintAttributes.Builder()
                    .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                    .setColorMode(PrintAttributes.COLOR_MODE_COLOR)
                    .build();

                printManager.print(jobName, webView.createPrintDocumentAdapter(jobName), attributes);

                JSObject result = new JSObject();
                result.put("jobName", jobName);
                call.resolve(result);
            } catch (Exception exception) {
                call.reject("Impossible de préparer le PDF.", exception);
            }
        });
    }
}
