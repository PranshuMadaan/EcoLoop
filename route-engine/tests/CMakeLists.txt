add_executable(routing_tests
    test_main.cpp
    test_graph.cpp
    test_optimizer.cpp
    test_fleet.cpp
    test_initial_builder.cpp
    test_engine.cpp
    test_io.cpp
)

target_link_libraries(routing_tests
    PRIVATE
        waste_routing
        Catch2::Catch2WithMain
        nlohmann_json::nlohmann_json
        project_warnings
)

include(CTest)
include(Catch)
catch_discover_tests(routing_tests)
