# Data Management — Android Studio APK Build Guide

ဤ Project တွင် **Capacitor Android (`android/`)** စနစ်ကို အသင့်ထည့်သွင်း ချိတ်ဆက်ပေးထားပြီး Android ဖုန်းများအတွက် Camera၊ Gallery၊ Native Share Sheet၊ File Download (`Documents/DataManagement/`) နှင့် Hardware Back Button စနစ်များအားလုံး အပြည့်အဝ အလုပ်လုပ်နိုင်ရန် ပြင်ဆင်ထားပါသည်။

---

## ၁။ လိုအပ်ချက်များ (Prerequisites)
- **Node.js** (v18 သို့မဟုတ် အထက်)
- **Android Studio** (Ladybug / Koala သို့မဟုတ် နောက်ဆုံးထွက် version — Android SDK API 35 နှင့် JDK 17/21 ပါဝင်ပြီးသား)

---

## ၂။ Android Studio ဖြင့် APK ဖိုင်ထုတ်ယူနည်း (Step-by-Step)

1. Project folder ထဲတွင် terminal ဖွင့်၍ dependency များ သွင်းပြီး Web code အသစ်များကို Android project သို့ sync လုပ်ပါ —
   ```bash
   npm install
   npm run android:sync
   ```
   *(ဤ command သည် `vite build` လုပ်ပြီး `android/app/src/main/assets/public` အတွင်းသို့ နောက်ဆုံးထွက် code များ ထည့်သွင်းပေးပါသည်။)*

2. **Android Studio** ကိုဖွင့်ပါ —
   ```bash
   npm run android:open
   ```
   *(သို့မဟုတ် Android Studio မှ **File > Open...** ကိုနှိပ်၍ ဤ project အတွင်းရှိ **`android`** ဖိုဒါလ်ကို ရွေးဖွင့်ပါ။)*

3. Android Studio အောက်ခြေတွင် **Gradle Sync** ပြီးဆုံးသည်အထိ ခေတ္တစောင့်ပါ။

4. **Debug APK ထုတ်ယူရန်** (ဖုန်းတွင် တိုက်ရိုက်စမ်းသပ်သွင်းယူရန်) —
   - Menu မှ **Build > Build Bundle(s) / APK(s) > Build APK(s)** ကိုနှိပ်ပါ။
   - ပြီးဆုံးပါက `Locate` ကိုနှိပ်ပါ သို့မဟုတ် အောက်ပါလမ်းကြောင်းတွင် `.apk` ဖိုင်ကို ရယူနိုင်ပါသည် —
     `android/app/build/outputs/apk/debug/app-debug.apk`

5. **Signed Release APK ထုတ်ယူရန်** (ဖြန့်ဝေရန်) —
   - Menu မှ **Build > Generate Signed App Bundle or APK...** ကိုနှိပ်ပါ။
   - **APK** ကိုရွေး၍ **Next** နှိပ်ပါ။
   - Keystore အသစ်ဖန်တီးရန် **Create new...** ကိုနှိပ်ပြီး Key အချက်အလက်များ ဖြည့်သွင်းပါ။
   - Build Variant တွင် **release** ကိုရွေး၍ **Create** နှိပ်ပါ။

---

## ၃။ Command Line (Gradle) မှ တိုက်ရိုက် APK ထုတ်ယူနည်း

Android Studio GUI မဖွင့်ဘဲ Terminal မှလည်း တိုက်ရိုက် build ပြုလုပ်နိုင်ပါသည် —
```bash
npm run android:sync
cd android
./gradlew assembleDebug
```
ထွက်ရှိလာသော APK ဖိုင်တည်နေရာ — `android/app/build/outputs/apk/debug/app-debug.apk`
