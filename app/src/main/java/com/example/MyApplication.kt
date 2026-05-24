package com.example

import android.app.Application
import android.util.Log

class MyApplication : Application() {

    override fun onCreate() {
        super.onCreate()
        
        // Log uncaught JVM exceptions safely to make debugging highly robust
        val defaultHandler = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
            Log.e("CRASH_HANDLER", "Uncaught exception on thread ${thread?.name}: ${throwable?.message}", throwable)
            System.err.println("CRASH_HANDLER: Uncaught exception:")
            throwable?.printStackTrace()
            
            // Delegate to the default system handler to allow graceful Android OS crash management
            if (defaultHandler != null) {
                defaultHandler.uncaughtException(thread, throwable)
            } else {
                System.exit(1)
            }
        }
    }
}
