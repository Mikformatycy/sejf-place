package pl.przybornik.coverswitcher

import android.content.ComponentName
import android.content.pm.PackageManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Each cover is an <activity-alias> of MainActivity with its own icon and label
 * (added by plugins/with-cover-aliases.js). Exactly one alias is enabled at a time.
 */
class CoverSwitcherModule : Module() {
  private val covers = listOf("przepisy", "zadania", "woda", "urodziny", "ksiazki", "kwiatki")

  private fun aliasName(packageName: String, id: String) =
    "$packageName.Cover${id.replaceFirstChar { it.uppercase() }}"

  override fun definition() = ModuleDefinition {
    Name("CoverSwitcher")

    AsyncFunction("setCover") { id: String ->
      val context = appContext.reactContext ?: return@AsyncFunction false
      if (id !in covers) return@AsyncFunction false
      val pm = context.packageManager
      val pkg = context.packageName
      // Enable the new alias first so the launcher never has zero entries.
      pm.setComponentEnabledSetting(
        ComponentName(pkg, aliasName(pkg, id)),
        PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
        PackageManager.DONT_KILL_APP
      )
      for (other in covers) {
        if (other == id) continue
        pm.setComponentEnabledSetting(
          ComponentName(pkg, aliasName(pkg, other)),
          PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
          PackageManager.DONT_KILL_APP
        )
      }
      true
    }

    Function("getCover") {
      val context = appContext.reactContext ?: return@Function null
      val pm = context.packageManager
      val pkg = context.packageName
      covers.firstOrNull { id ->
        val state = pm.getComponentEnabledSetting(ComponentName(pkg, aliasName(pkg, id)))
        state == PackageManager.COMPONENT_ENABLED_STATE_ENABLED ||
          (state == PackageManager.COMPONENT_ENABLED_STATE_DEFAULT && id == "przepisy")
      }
    }
  }
}
