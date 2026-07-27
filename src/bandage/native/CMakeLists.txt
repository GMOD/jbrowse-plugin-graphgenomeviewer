cmake_minimum_required(VERSION 3.10)
project(bandage-layout-js)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Where a built OGDF lives. Not vendored: it is ~85 MB of build tree and takes
# far longer to compile than this port does. scripts/build-wasm.sh passes it.
set(OGDF_DIR "" CACHE PATH "OGDF checkout with a build-wasm/libOGDF.a in it")
if(NOT OGDF_DIR)
    message(FATAL_ERROR "Set -DOGDF_DIR=<ogdf checkout> (see scripts/build-wasm.sh)")
endif()

if(NOT EMSCRIPTEN)
    message(FATAL_ERROR "Configure with emcmake: this target is the wasm engine")
endif()

set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -O3 -s WASM=1 -s ALLOW_MEMORY_GROWTH=1")
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -s MODULARIZE=1 -s EXPORT_ES6=1")
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -s EXPORT_NAME='createBandageLayoutModule'")
# node is in the list so the determinism test can drive the engine outside a
# browser; web and worker are how the plugin actually loads it.
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -s ENVIRONMENT='web,worker,node'")
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} --bind")
# The wasm rides inlined as base64, so the engine is one self-contained ES
# module that esbuild can emit as a lazy chunk with no sibling .wasm to host.
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -s SINGLE_FILE=1")

include_directories(${CMAKE_SOURCE_DIR}/include)
include_directories(${OGDF_DIR}/include)
include_directories(${OGDF_DIR}/build-wasm/include)
link_directories(${OGDF_DIR}/build-wasm)

add_executable(bandage-layout src/graphlayout.cpp src/bindings.cpp)
target_link_libraries(bandage-layout OGDF)
set_target_properties(bandage-layout PROPERTIES
    RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}"
    SUFFIX ".js"
)
