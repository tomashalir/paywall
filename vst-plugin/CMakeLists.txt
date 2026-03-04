cmake_minimum_required(VERSION 3.22)

project(ScanbassVST VERSION 0.1.0)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

if (NOT DEFINED JUCE_DIR)
  message(FATAL_ERROR "Set JUCE_DIR to your local JUCE checkout, for example: -DJUCE_DIR=/path/to/JUCE")
endif()

add_subdirectory(${JUCE_DIR} JUCE)

juce_add_plugin(ScanbassVisualizer
  COMPANY_NAME "Scanbass"
  IS_SYNTH FALSE
  NEEDS_MIDI_INPUT FALSE
  NEEDS_MIDI_OUTPUT FALSE
  IS_MIDI_EFFECT FALSE
  COPY_PLUGIN_AFTER_BUILD TRUE
  PLUGIN_MANUFACTURER_CODE ScnB
  PLUGIN_CODE ScVB
  FORMATS VST3
  PRODUCT_NAME "Scanbass Visualizer"
)

target_sources(ScanbassVisualizer
  PRIVATE
    Source/PluginProcessor.cpp
    Source/PluginProcessor.h
    Source/PluginEditor.cpp
    Source/PluginEditor.h
)

target_compile_definitions(ScanbassVisualizer
  PRIVATE
    JUCE_VST3_CAN_REPLACE_VST2=0
    SCANBASS_DEV_DIST_DIR="${CMAKE_CURRENT_SOURCE_DIR}/../dist"
  PUBLIC
    JUCE_WEB_BROWSER=1
    JUCE_USE_CURL=0
)

target_link_libraries(ScanbassVisualizer
  PRIVATE
    juce::juce_audio_utils
    juce::juce_dsp
  PUBLIC
    juce::juce_recommended_config_flags
    juce::juce_recommended_lto_flags
    juce::juce_recommended_warning_flags
)

if (TARGET ScanbassVisualizer_VST3)
  set(VST3_RESOURCES_DIR "$<TARGET_FILE_DIR:ScanbassVisualizer_VST3>/../Resources/WebAssets")

  add_custom_command(
    TARGET ScanbassVisualizer_VST3
    PRE_LINK
    COMMAND ${CMAKE_COMMAND} -E remove_directory "${VST3_RESOURCES_DIR}"
    COMMAND ${CMAKE_COMMAND} -E make_directory "${VST3_RESOURCES_DIR}"
    COMMAND ${CMAKE_COMMAND} -E copy_directory
      "${CMAKE_CURRENT_SOURCE_DIR}/../dist"
      "${VST3_RESOURCES_DIR}"
    COMMENT "Staging Web bridge assets in VST3 bundle resources"
  )
endif()
