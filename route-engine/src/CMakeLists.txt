add_library(waste_routing STATIC
    graph.cpp
    route.cpp
    cost_evaluator.cpp
    optimizer.cpp
    vehicle.cpp
    solution.cpp
    fleet_optimizer.cpp
    facility_index.cpp
    initial_builder.cpp
    engine.cpp
    io.cpp
)

target_include_directories(waste_routing
    PUBLIC
        $<BUILD_INTERFACE:${PROJECT_SOURCE_DIR}/include>
        $<INSTALL_INTERFACE:include>
)

target_link_libraries(waste_routing
    PUBLIC
        project_warnings
    PRIVATE
        nlohmann_json::nlohmann_json
)

add_executable(waste_router_cli
    main.cpp
)

target_link_libraries(waste_router_cli
    PRIVATE
        waste_routing
        nlohmann_json::nlohmann_json
        project_warnings
)
