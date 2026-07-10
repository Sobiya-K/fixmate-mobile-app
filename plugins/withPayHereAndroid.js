const {
  AndroidConfig,
  createRunOncePlugin,
  withAndroidManifest,
  withProjectBuildGradle,
  withSettingsGradle,
} = require("@expo/config-plugins");

const PLUGIN_NAME = "with-payhere-android";
const PLUGIN_VERSION = "1.0.0";
const JITPACK_URL = "https://jitpack.io";

function addJitPackToProjectBuildGradle(contents) {
  if (contents.includes(JITPACK_URL)) {
    return contents;
  }

  const allProjectsRepositoriesPattern =
    /allprojects\s*\{\s*repositories\s*\{/m;

  if (allProjectsRepositoriesPattern.test(contents)) {
    return contents.replace(
      allProjectsRepositoriesPattern,
      (match) =>
        `${match}\n        maven { url '${JITPACK_URL}' }`
    );
  }

  return `${contents.trim()}

allprojects {
    repositories {
        maven { url '${JITPACK_URL}' }
    }
}
`;
}

function addJitPackToSettingsGradle(contents) {
  if (contents.includes(JITPACK_URL)) {
    return contents;
  }

  const dependencyBlockStart =
    contents.indexOf("dependencyResolutionManagement");

  if (dependencyBlockStart === -1) {
    return contents;
  }

  const repositoriesStart =
    contents.indexOf("repositories {", dependencyBlockStart);

  if (repositoriesStart === -1) {
    return contents;
  }

  const insertionPoint =
    repositoriesStart + "repositories {".length;

  return (
    contents.slice(0, insertionPoint) +
    `\n        maven { url '${JITPACK_URL}' }` +
    contents.slice(insertionPoint)
  );
}

function mergeToolsReplace(existingValue, requiredValue) {
  const values = new Set(
    String(existingValue || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
  );

  values.add(requiredValue);

  return Array.from(values).join(",");
}

const withPayHereAndroid = (config) => {
  config = withProjectBuildGradle(config, (projectConfig) => {
    if (projectConfig.modResults.language !== "groovy") {
      throw new Error(
        "FixMate PayHere plugin expected android/build.gradle to use Groovy."
      );
    }

    projectConfig.modResults.contents =
      addJitPackToProjectBuildGradle(
        projectConfig.modResults.contents
      );

    return projectConfig;
  });

  config = withSettingsGradle(config, (settingsConfig) => {
    settingsConfig.modResults.contents =
      addJitPackToSettingsGradle(
        settingsConfig.modResults.contents
      );

    return settingsConfig;
  });

  config = withAndroidManifest(config, (manifestConfig) => {
    const manifest = manifestConfig.modResults.manifest;

    manifest.$ = manifest.$ || {};
    manifest.$["xmlns:tools"] =
      "http://schemas.android.com/tools";

    const application =
      AndroidConfig.Manifest.getMainApplicationOrThrow(
        manifestConfig.modResults
      );

    application.$ = application.$ || {};

    application.$["tools:replace"] =
      mergeToolsReplace(
        application.$["tools:replace"],
        "android:allowBackup"
      );

    if (!application.$["android:allowBackup"]) {
      application.$["android:allowBackup"] = "false";
    }

    return manifestConfig;
  });

  return config;
};

module.exports = createRunOncePlugin(
  withPayHereAndroid,
  PLUGIN_NAME,
  PLUGIN_VERSION
);
