import java.util.Properties
import java.io.FileInputStream

plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

val keystoreProperties = Properties()
val keystorePropertiesFile = rootProject.file("key.properties")
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(FileInputStream(keystorePropertiesFile))
}

android {
    namespace = "com.rewardapp.student_app"
    compileSdk = 35 // Explicitly set to support modern Android APIs
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    signingConfigs {
        create("release") {
            keyAlias = keystoreProperties["keyAlias"] as String
            keyPassword = keystoreProperties["keyPassword"] as String
            storeFile = file(keystoreProperties["storeFile"] as String)
            storePassword = keystoreProperties["storePassword"] as String
        }
    }

    defaultConfig {
        applicationId = "com.rewardapp.student_app"
        
        // 1. Old Phone Support: API 21 (Android 5.0) gives 99%+ device compatibility.
        // If using plugins like camera or sqflite, API 21-24 is the ideal sweet spot.
        minSdk = flutter.minSdkVersion 
        
        // 2. New Phone Support: API 35 is required for modern Android device compliance
        targetSdk = 35 
        
        versionCode = flutter.versionCode
        versionName = flutter.versionName

        // 3. Architecture support: Pack binaries for both 32-bit (old) & 64-bit (new) phones
        ndk {
            abiFilters.addAll(setOf("armeabi-v7a", "arm64-v8a", "x86_64"))
        }
    }

    buildTypes {
        release {
            signingConfig = signingConfigs.getByName("release")
            isMinifyEnabled = false
            isShrinkResources = false
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}
