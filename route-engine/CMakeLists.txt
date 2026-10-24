cmake_minimum_required(VERSION 3.28)

project(WasteRouteOptimizer
    VERSION 0.1.0
    DESCRIPTION "High-performance C++23 waste collection route optimization engine"
    LANGUAGES CXX
)

set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# Dedicated warnings target applied strictly to project targets
add_library(project_warnings INTERFACE)

if(MSVC)
    target_compile_options(project_warnings INTERFACE
        /W4
        /WX
        /permissive-
    )
else()
    target_compile_options(project_warnings INTERFACE
        -Wall
        -Wextra
        -Wpedantic
        -Werror
        -Wconversion
        -Wshadow
    )
endif()

# Fetch Catch2 v3 self-contained without pre-installed dependencies
include(FetchContent)
FetchContent_Declare(
    Catch2
    GIT_REPOSITORY https://github.com/catchorg/Catch2.git
    GIT_TAG v3.5.2
    SYSTEM
)

FetchContent_Declare(
    nlohmann_json
    GIT_REPOSITORY https://github.com/nlohmann/json.git
    GIT_TAG v3.11.3
    SYSTEM
)
FetchContent_MakeAvailable(Catch2 nlohmann_json)

add_subdirectory(src)

enable_testing()
add_subdirectory(tests)
