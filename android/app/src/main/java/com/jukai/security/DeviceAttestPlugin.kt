package com.jukai.security

import android.os.Build
import android.util.Base64
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.security.*
import java.security.cert.X509Certificate
import java.security.spec.ECGenParameterSpec
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import androidx.fragment.app.FragmentActivity

@CapacitorPlugin(name = "DeviceAttestPlugin")
class DeviceAttestPlugin : Plugin() {

    companion object {
        private const val KEYSTORE_ALIAS = "biometric_attested_key_"
        private const val KEYSTORE_PROVIDER = "AndroidKeyStore"
        private const val EC_CURVE = "secp256r1"
        private const val SIGNATURE_ALGORITHM = "SHA256withECDSA"
    }

    private fun getKeyAlias(userId: String?): String {
        return if (!userId.isNullOrEmpty()) {
            "${KEYSTORE_ALIAS}${userId}"
        } else {
            "${KEYSTORE_ALIAS}default"
        }
    }

    @PluginMethod
    fun generateKeypairAndAttest(call: PluginCall) {
        val challengeB64 = call.getString("challenge") ?: return call.reject("challenge required")
        val userId = call.getString("userId") // Opcional, para múltiples usuarios
        val keyAlias = getKeyAlias(userId)

        try {
            val challenge = Base64.decode(challengeB64, Base64.URL_SAFE or Base64.NO_WRAP)

            // Eliminar clave existente si existe
            deleteExistingKey(keyAlias)

            // Generar nueva clave con atestación
            val kpg = KeyPairGenerator.getInstance("EC", KEYSTORE_PROVIDER)
            
            // Intentar con StrongBox primero
            var builder = createKeyGenParameterSpec(keyAlias, challenge, true)
            var keyPair: KeyPair
            
            try {
                kpg.initialize(builder)
                keyPair = kpg.generateKeyPair()
            } catch (e: Exception) {
                // Si StrongBox falla, intentar con TEE
                builder = createKeyGenParameterSpec(keyAlias, challenge, false)
                kpg.initialize(builder)
                keyPair = kpg.generateKeyPair()
            }

            // Exportar clave pública en formato PEM
            val pubSpkiDer = keyPair.public.encoded
            val pubPem = pemEncode("PUBLIC KEY", pubSpkiDer)

            // Obtener cadena de certificados de atestación
            val keystore = KeyStore.getInstance(KEYSTORE_PROVIDER)
            keystore.load(null)
            val certChain = keystore.getCertificateChain(keyAlias)
            val chainPem = certChain.joinToString("\n") { 
                pemEncode("CERTIFICATE", it.encoded) 
            }

            // Calcular device_id como SHA256 de la clave pública
            val messageDigest = MessageDigest.getInstance("SHA-256")
            val deviceIdBytes = messageDigest.digest(pubSpkiDer)
            val deviceId = Base64.encodeToString(deviceIdBytes, Base64.URL_SAFE or Base64.NO_WRAP)
                .trimEnd('=')

            val result = JSObject()
            result.put("publicKey", Base64.encodeToString(pubSpkiDer, Base64.URL_SAFE or Base64.NO_WRAP).trimEnd('='))
            result.put("attestationChain", certChain.map { 
                Base64.encodeToString(it.encoded, Base64.URL_SAFE or Base64.NO_WRAP).trimEnd('=')
            }.toTypedArray())
            result.put("deviceId", deviceId)
            result.put("keyAlias", keyAlias)
            
            call.resolve(result)

        } catch (e: Exception) {
            call.reject("Key generation/attestation failed: ${e.message}", e)
        }
    }

    @PluginMethod
    fun signWithBiometrics(call: PluginCall) {
        val challengeB64 = call.getString("challenge") ?: return call.reject("challenge required")
        val userId = call.getString("userId")
        val keyAlias = getKeyAlias(userId)

        try {
            val challenge = Base64.decode(challengeB64, Base64.URL_SAFE or Base64.NO_WRAP)

            // Preparar signature con la clave privada
            val keystore = KeyStore.getInstance(KEYSTORE_PROVIDER)
            keystore.load(null)
            
            if (!keystore.containsAlias(keyAlias)) {
                return call.reject("Key not found for alias: $keyAlias")
            }

            val entry = keystore.getEntry(keyAlias, null) as KeyStore.PrivateKeyEntry
            val signature = Signature.getInstance(SIGNATURE_ALGORITHM)
            signature.initSign(entry.privateKey)

            // Obtener la clave pública para calcular deviceId
            val publicKey = entry.certificate.publicKey
            val pubSpkiDer = publicKey.encoded
            val messageDigest = MessageDigest.getInstance("SHA-256")
            val deviceIdBytes = messageDigest.digest(pubSpkiDer)
            val deviceId = Base64.encodeToString(deviceIdBytes, Base64.URL_SAFE or Base64.NO_WRAP)
                .trimEnd('=')

            // Configurar BiometricPrompt
            val executor = ContextCompat.getMainExecutor(context)
            val promptInfo = BiometricPrompt.PromptInfo.Builder()
                .setTitle("Autenticación Biométrica")
                .setSubtitle("Confirma tu identidad para acceder")
                .setDescription("Usa tu huella dactilar o reconocimiento facial")
                .setNegativeButtonText("Cancelar")
                .setAllowedAuthenticators(androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_STRONG)
                .build()

            val activity = activity as FragmentActivity
            val biometricPrompt = BiometricPrompt(activity, executor,
                object : BiometricPrompt.AuthenticationCallback() {
                    override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                        try {
                            signature.update(challenge)
                            val sigDer = signature.sign()
                            
                            val response = JSObject()
                            response.put("signature", Base64.encodeToString(sigDer, Base64.URL_SAFE or Base64.NO_WRAP).trimEnd('='))
                            response.put("deviceId", deviceId)
                            response.put("keyAlias", keyAlias)
                            call.resolve(response)
                        } catch (e: Exception) {
                            call.reject("Signing failed: ${e.message}", e)
                        }
                    }

                    override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                        call.reject("Biometric authentication error: $errString")
                    }

                    override fun onAuthenticationFailed() {
                        call.reject("Biometric authentication failed")
                    }
                })

            // Lanzar prompt biométrico
            biometricPrompt.authenticate(promptInfo, BiometricPrompt.CryptoObject(signature))

        } catch (e: Exception) {
            call.reject("Sign initialization failed: ${e.message}", e)
        }
    }

    @PluginMethod
    fun checkBiometricAvailability(call: PluginCall) {
        try {
            val biometricManager = androidx.biometric.BiometricManager.from(context)
            val canAuthenticate = biometricManager.canAuthenticate(androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_STRONG)
            
            val result = JSObject()
            when (canAuthenticate) {
                androidx.biometric.BiometricManager.BIOMETRIC_SUCCESS -> {
                    result.put("available", true)
                    result.put("status", "AVAILABLE")
                }
                androidx.biometric.BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE -> {
                    result.put("available", false)
                    result.put("status", "NO_HARDWARE")
                }
                androidx.biometric.BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE -> {
                    result.put("available", false)
                    result.put("status", "HW_UNAVAILABLE")
                }
                androidx.biometric.BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED -> {
                    result.put("available", false)
                    result.put("status", "NONE_ENROLLED")
                }
                else -> {
                    result.put("available", false)
                    result.put("status", "UNKNOWN")
                }
            }
            
            call.resolve(result)
        } catch (e: Exception) {
            call.reject("Failed to check biometric availability: ${e.message}", e)
        }
    }

    @PluginMethod
    fun deleteKey(call: PluginCall) {
        val userId = call.getString("userId")
        val keyAlias = getKeyAlias(userId)
        
        try {
            deleteExistingKey(keyAlias)
            
            val result = JSObject()
            result.put("deleted", true)
            result.put("keyAlias", keyAlias)
            call.resolve(result)
            
        } catch (e: Exception) {
            call.reject("Failed to delete key: ${e.message}", e)
        }
    }

    private fun createKeyGenParameterSpec(
        keyAlias: String, 
        challenge: ByteArray, 
        useStrongBox: Boolean
    ): KeyGenParameterSpec {
        val builder = KeyGenParameterSpec.Builder(
            keyAlias,
            KeyProperties.PURPOSE_SIGN
        )
            .setAlgorithmParameterSpec(ECGenParameterSpec(EC_CURVE))
            .setDigests(KeyProperties.DIGEST_SHA256)
            .setUserAuthenticationRequired(true)
            .setUserAuthenticationValidityDurationSeconds(60)

        // Funciones que requieren API 24+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            builder.setAttestationChallenge(challenge)
            builder.setInvalidatedByBiometricEnrollment(false) // No invalidar si cambian las huellas
        }

        // Si está disponible, usar StrongBox para máxima seguridad (API 28+)
        if (useStrongBox && Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            builder.setIsStrongBoxBacked(true)
        }

        return builder.build()
    }

    private fun deleteExistingKey(keyAlias: String) {
        try {
            val keystore = KeyStore.getInstance(KEYSTORE_PROVIDER)
            keystore.load(null)
            if (keystore.containsAlias(keyAlias)) {
                keystore.deleteEntry(keyAlias)
            }
        } catch (e: Exception) {
            // Log pero no fallar
            android.util.Log.w("DeviceAttestPlugin", "Failed to delete existing key: ${e.message}")
        }
    }

    private fun pemEncode(type: String, der: ByteArray): String {
        val b64 = Base64.encodeToString(der, Base64.NO_WRAP)
        return "-----BEGIN $type-----\n$b64\n-----END $type-----"
    }

    private fun b64url(bytes: ByteArray): String {
        return Base64.encodeToString(bytes, Base64.URL_SAFE or Base64.NO_WRAP)
            .trimEnd('=')
    }
}
