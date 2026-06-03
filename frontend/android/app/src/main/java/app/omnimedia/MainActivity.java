// FILE: frontend/android/app/src/main/java/app/omnimedia/MainActivity.java
// Activity principal do OmniMedia Android.
// Detecta se está rodando em Android TV via UiModeManager
// e injeta window.__OMNIMEDIA_TV__ para que platform.js saiba.

package app.omnimedia;

import android.app.UiModeManager;
import android.content.Context;
import android.content.res.Configuration;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Detecta Android TV via UiModeManager
        UiModeManager uiModeManager = (UiModeManager) getSystemService(Context.UI_MODE_SERVICE);
        boolean isTV = uiModeManager != null &&
                uiModeManager.getCurrentModeType() == Configuration.UI_MODE_TYPE_TELEVISION;

        if (isTV) {
            // Injeta a flag antes de qualquer script do app
            getBridge().getWebView().evaluateJavascript(
                "window.__OMNIMEDIA_TV__ = true;",
                null
            );
        }
    }
}
