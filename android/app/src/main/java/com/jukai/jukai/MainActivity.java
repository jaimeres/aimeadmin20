package com.jukai.jukai;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.jukai.security.DeviceAttestPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Register custom plugins
        registerPlugin(DeviceAttestPlugin.class);
        registerPlugin(SafeCameraPlugin.class);
    }
}
