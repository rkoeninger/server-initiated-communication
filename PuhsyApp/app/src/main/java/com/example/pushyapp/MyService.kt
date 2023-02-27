package com.example.pushyapp

import android.util.Log
import com.android.volley.Request
import com.android.volley.toolbox.JsonObjectRequest
import com.android.volley.toolbox.Volley
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import org.json.JSONObject

class MyService : FirebaseMessagingService() {
    private var activeToken: String? = null

    override fun onMessageReceived(message: RemoteMessage) {
        Log.d("MyService", "onMessageReceived")
        // TODO: add this message to screen
    }

    override fun onNewToken(token: String) {
        Log.d("MyService", "onNewToken")
        // TODO: post this token to web server
        activeToken = token
        Volley.newRequestQueue(this).add(JsonObjectRequest(
            Request.Method.POST,
            "http://10.0.2.2:3000/subscribe",
            JSONObject(""),
            { response ->
                null
            },
            { error ->
                null
            }
        ))
    }
}
