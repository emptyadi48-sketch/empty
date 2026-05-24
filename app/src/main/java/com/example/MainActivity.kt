package com.example

import android.annotation.SuppressLint
import android.graphics.Bitmap
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.example.ui.theme.MyApplicationTheme

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Pre-create WebView cache directories with placeholder files to prevent Chromium opendir errors on startup
        try {
            val cacheDir = applicationContext.cacheDir
            val jsCodeCacheFile = java.io.File(cacheDir, "WebView/Default/HTTP Cache/Code Cache/js")
            val wasmCodeCacheFile = java.io.File(cacheDir, "WebView/Default/HTTP Cache/Code Cache/wasm")
            if (!jsCodeCacheFile.exists()) {
                jsCodeCacheFile.mkdirs()
            }
            if (!wasmCodeCacheFile.exists()) {
                wasmCodeCacheFile.mkdirs()
            }
            
            // Create dummy placeholder files inside the cache directories
            // so they are not empty and get read successfully on startup
            val jsPlaceholder = java.io.File(jsCodeCacheFile, ".placeholder")
            if (!jsPlaceholder.exists()) {
                jsPlaceholder.createNewFile()
            }
            val wasmPlaceholder = java.io.File(wasmCodeCacheFile, ".placeholder")
            if (!wasmPlaceholder.exists()) {
                wasmPlaceholder.createNewFile()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        
        // Full bleed edge-to-edge support
        enableEdgeToEdge()
        
        setContent {
            MyApplicationTheme {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color(0xFF06030F)) // Matches deep dark purple background to eliminate white flashes
                ) {
                    GameWebViewScreen()
                }
            }
        }
    }
}

private fun cleanUpWebView(wv: WebView?) {
    wv?.let {
        if (it.getTag(0x7FFFFFFF) == true) return
        it.setTag(0x7FFFFFFF, true)
        try {
            it.stopLoading()
            it.removeJavascriptInterface("AndroidApp")
            it.webChromeClient = WebChromeClient()
            it.webViewClient = WebViewClient()
            (it.parent as? ViewGroup)?.removeView(it)
            
            // Post WebView destruction to the end of the message loop to prevent destroying
            // active UI surfaces while the OS input dispatcher is routing ongoing events/touches.
            android.os.Handler(android.os.Looper.getMainLooper()).post {
                try {
                    it.destroy()
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}

private fun android.content.Context.findActivity(): android.app.Activity? {
    var currentContext = this
    while (currentContext is android.content.ContextWrapper) {
        if (currentContext is android.app.Activity) {
            return currentContext
        }
        currentContext = currentContext.baseContext
    }
    return null
}

class WebAppInterface(private val onExit: () -> Unit) {
    @android.webkit.JavascriptInterface
    fun exitApp() {
        onExit()
    }
}

@SuppressLint("SetJavaScriptEnabled", "NewApi")
@Composable
fun GameWebViewScreen() {
    var recreateKey by remember { mutableStateOf(0) }
    var useSoftwareRendering by remember { mutableStateOf(false) }
    var webViewInstance by remember { mutableStateOf<WebView?>(null) }
    var crashCount by remember { mutableStateOf(0) }
    val lifecycleOwner = LocalLifecycleOwner.current

    // Observe lifecycle events to pause/resume WebView, stop media/audio threads,
    // and avoid system kills or process channel unrecoverable broken events.
    DisposableEffect(lifecycleOwner, recreateKey, webViewInstance) {
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_RESUME -> {
                    try {
                        webViewInstance?.onResume()
                        webViewInstance?.resumeTimers()
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                }
                Lifecycle.Event.ON_PAUSE -> {
                    try {
                        webViewInstance?.onPause()
                        webViewInstance?.pauseTimers()
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                }
                else -> {}
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }

    // Intercept Back gestures to go back inside menus or exit smoothly
    BackHandler(enabled = webViewInstance != null) {
        webViewInstance?.let { wv ->
            try {
                if (wv.canGoBack()) {
                    wv.goBack()
                } else {
                    // Evaluate screen visibility dynamically with a robust multi-screen fallback check.
                    // If a secondary overlay/sub-screen (e.g. ready state, shops, hud, howto, leaderboard) is active,
                    // we transition back to the main menu first. If the main menu or login screen is active, 
                    // we invoke the AndroidApp bridge method to cleanly finish the activity.
                    wv.evaluateJavascript(
                        """
                        (function() {
                            var subScreens = ["ready", "hud", "pause", "complete", "gameover", "leaderboard", "shop", "achievements", "howto"];
                            var isSubActive = false;
                            for (var i = 0; i < subScreens.length; i++) {
                                var el = document.getElementById("screen-" + subScreens[i]);
                                if (el && !el.classList.contains("hidden")) {
                                    isSubActive = true;
                                    break;
                                }
                            }
                            if (isSubActive) {
                                if (typeof UI !== 'undefined') { UI.showScreen('menu'); }
                                return 'menu';
                            } else {
                                if (typeof AndroidApp !== 'undefined') {
                                    AndroidApp.exitApp();
                                    return 'exit';
                                }
                            }
                            return 'none';
                        })()
                        """.trimIndent(),
                        { result ->
                            // If result is not "menu", make sure we finish the Activity on the Main thread
                            if (result != "\"menu\"" && result != "menu") {
                                android.os.Handler(android.os.Looper.getMainLooper()).post {
                                    (wv.context.findActivity())?.finish()
                                }
                            }
                        }
                    )
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    key(recreateKey) {
        AndroidView(
             modifier = Modifier.fillMaxSize(),
             factory = { context ->
                 val webViewContext = if (android.os.Build.VERSION.SDK_INT >= 30) {
                     try {
                         context.createAttributionContext("audio")
                     } catch (e: Exception) {
                         context
                     }
                 } else {
                     context
                 }
                 WebView(webViewContext).apply {
                    layoutParams = ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    )

                    // Start with optimized GPU hardware rendering, but fallback gracefully to Software if native system crashes are experienced
                    if (useSoftwareRendering) {
                        setLayerType(View.LAYER_TYPE_SOFTWARE, null)
                    } else {
                        setLayerType(View.LAYER_TYPE_NONE, null)
                    }

                    settings.apply {
                        javaScriptEnabled = true
                        domStorageEnabled = true // Required for progress local storage
                        allowFileAccess = true
                        allowContentAccess = true
                        
                        // Allows Web Audio procedural BGM to start playing programmatically
                        mediaPlaybackRequiresUserGesture = false
                        
                        // Viewport sizing alignment
                        useWideViewPort = true
                        loadWithOverviewMode = true
                        
                        // Disable zooms to preserve pixel perfect gaming scaling
                        setSupportZoom(false)
                        builtInZoomControls = false
                        displayZoomControls = false
                    }

                    addJavascriptInterface(WebAppInterface {
                        android.os.Handler(android.os.Looper.getMainLooper()).post {
                            (context.findActivity())?.finish()
                        }
                    }, "AndroidApp")

                    webChromeClient = object : WebChromeClient() {
                        override fun onConsoleMessage(consoleMessage: android.webkit.ConsoleMessage?): Boolean {
                            if (consoleMessage != null) {
                                android.util.Log.d(
                                    "GameWebView",
                                    "${consoleMessage.message()} -- From line ${consoleMessage.lineNumber()} of ${consoleMessage.sourceId()}"
                                )
                            }
                            return true
                        }
                    }
                    webViewClient = object : WebViewClient() {
                        override fun shouldOverrideUrlLoading(
                            view: WebView?,
                            request: WebResourceRequest?
                        ): Boolean {
                            // Keep navigation internal to local assets
                            return false
                        }

                        override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                            super.onPageStarted(view, url, favicon)
                            // Make page render background seamless
                            view?.setBackgroundColor(0xFF06030F.toInt())
                        }

                        override fun onRenderProcessGone(
                            view: WebView?,
                            detail: android.webkit.RenderProcessGoneDetail?
                        ): Boolean {
                            android.util.Log.e(
                                "GameWebView",
                                "Render process gone! Crash: ${detail?.didCrash()}, Priority: ${detail?.rendererPriorityAtExit()}"
                            )
                            // Clean up safely and trigger recreation asynchronously on main thread.
                            // Using a distinct main thread Handler ensures recreation runs even if the crashed WebView view's internal queue cannot proceed with a post.
                            android.os.Handler(android.os.Looper.getMainLooper()).post {
                                webViewInstance = null
                                crashCount++
                                if (crashCount <= 3) {
                                    if (!useSoftwareRendering) {
                                        useSoftwareRendering = true
                                    }
                                    recreateKey++
                                } else {
                                    android.util.Log.e("GameWebView", "WebView crashed repeatedly. Halting auto-recreation to protect system input channel.")
                                }
                            }
                            return true
                        }
                    }

                    // Load packed offline-ready HTML5 Game asset
                    loadUrl("file:///android_asset/index.html")
                    webViewInstance = this
                }
             },
            update = {
                // No-op to prevent state-mutation loops during recomposition
            },
            onRelease = { wv ->
                cleanUpWebView(wv)
                webViewInstance = null
            }
        )
    }
}
