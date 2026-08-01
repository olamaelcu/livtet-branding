plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
}

group = "net.olamaelcu"

android {
    namespace = "net.olamaelcu.livtet.branding"
    compileSdk = 35

    defaultConfig {
        minSdk = 24
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation(platform("androidx.compose:compose-bom:2026.03.00"))
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui")
}
