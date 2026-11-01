plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.ksp)
}

android {
    namespace = "com.atomik.activity"
    compileSdk = 37

    defaultConfig {
        applicationId = "com.atomik.activity"
        minSdk = 26
        targetSdk = 36
        versionCode = 3
        versionName = "2.1.0"

        buildConfigField("String", "BACKEND_URL", "\"http://10.0.2.2:3000/api\"")
    }

    signingConfigs {
        // The app's signing key (originally the Expo build's debug keystore). Keep a
        // backup: installing an APK signed with a different key over an existing
        // install fails, forcing an uninstall that wipes unsynced points.
        // The keystore is not committed; without it (e.g. CI) AGP's default debug key is used.
        val appKeystore = file("debug.keystore")
        if (appKeystore.exists()) {
            getByName("debug") {
                storeFile = appKeystore
                storePassword = "android"
                keyAlias = "androiddebugkey"
                keyPassword = "android"
            }
        }
    }

    buildTypes {
        debug {
            signingConfig = signingConfigs.getByName("debug")
            buildConfigField("Boolean", "ENABLE_LOGGING", "true")
        }
        release {
            signingConfig = signingConfigs.getByName("debug")
            isMinifyEnabled = false
            buildConfigField("Boolean", "ENABLE_LOGGING", "false")
        }
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
        isCoreLibraryDesugaringEnabled = false
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
    }
}

dependencies {
    implementation(libs.core.ktx)

    // Compose
    val composeBom = platform(libs.compose.bom)
    implementation(composeBom)
    implementation(libs.compose.ui)
    implementation(libs.compose.ui.tooling.preview)
    implementation(libs.compose.material3)
    implementation(libs.compose.icons)
    implementation(libs.activity.compose)
    implementation(libs.navigation.compose)
    debugImplementation(libs.compose.ui.tooling)

    // Lifecycle
    implementation(libs.lifecycle.viewmodel.compose)
    implementation(libs.lifecycle.runtime.compose)

    // Room
    implementation(libs.room.runtime)
    implementation(libs.room.ktx)
    ksp(libs.room.compiler)

    // DataStore
    implementation(libs.datastore.prefs)

    // Network
    implementation(libs.retrofit)
    implementation(libs.retrofit.kotlin.serial)
    implementation(libs.okhttp)
    implementation(libs.okhttp.logging)
    implementation(libs.kotlinx.serialization)

    // Coroutines
    implementation(libs.coroutines.android)

    // WorkManager
    implementation(libs.workmanager)

    // Maps
    implementation(libs.osmdroid)

    // Location + Activity Recognition (FusedLocationProvider + ActivityRecognition)
    implementation(libs.play.activity.recognition)
}
