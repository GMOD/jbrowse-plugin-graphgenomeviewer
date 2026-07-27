// Emscripten bindings for Bandage Layout

#include <emscripten/bind.h>
#include <emscripten/val.h>
#include "../include/graphlayout.h"
#include "../include/settings.h"
#include <sstream>

using namespace emscripten;

// Helper to create graph from JavaScript object
AssemblyGraph* createGraphFromJS(const val& jsGraph) {
    auto* graph = new AssemblyGraph();

    // Parse nodes
    val jsNodes = jsGraph["nodes"];
    unsigned length = jsNodes["length"].as<unsigned>();

    for (unsigned i = 0; i < length; ++i) {
        val node = jsNodes[i];
        std::string id = node["id"].as<std::string>();
        unsigned nodeLength = node["length"].as<unsigned>();
        float depth = node["depth"].as<float>();

        auto* n = graph->addNode(id, nodeLength, depth);
        n->setAsDrawn(); // Assume all input nodes should be drawn
    }

    // Set up reverse complements (assuming +/- naming convention)
    for (auto& pair : graph->nodes) {
        std::string name = pair.first;
        if (name.empty()) continue;

        char sign = name.back();
        std::string baseName = name.substr(0, name.length() - 1);

        if (sign == '+') {
            std::string rcName = baseName + "-";
            auto it = graph->nodes.find(rcName);
            if (it != graph->nodes.end()) {
                pair.second->setReverseComplement(it->second);
                it->second->setReverseComplement(pair.second);
            }
        }
    }

    // Parse edges
    val jsEdges = jsGraph["edges"];
    length = jsEdges["length"].as<unsigned>();

    for (unsigned i = 0; i < length; ++i) {
        val edge = jsEdges[i];
        std::string from = edge["from"].as<std::string>();
        std::string to = edge["to"].as<std::string>();
        int overlap = edge.hasOwnProperty("overlap") ?
                     edge["overlap"].as<int>() : 0;

        auto* e = graph->addEdge(from, to, overlap, UNKNOWN_OVERLAP);
        if (e) e->setAsDrawn();
    }

    return graph;
}

// Helper to convert layout to JavaScript object
val layoutToJS(const GraphLayout& layout) {
    val result = val::object();
    val nodePositions = val::object();

    for (const auto& entry : layout) {
        std::string nodeName = entry.first->getName();
        const auto& segments = entry.second;

        val jsSegments = val::array();
        for (size_t i = 0; i < segments.size(); ++i) {
            val point = val::object();
            point.set("x", segments[i].x);
            point.set("y", segments[i].y);
            jsSegments.set(i, point);
        }

        nodePositions.set(nodeName, jsSegments);
    }

    result.set("nodePositions", nodePositions);
    return result;
}

// Main layout computation function exposed to JavaScript
val computeLayout(val jsGraph, val jsOptions) {
    // Parse options
    int quality = jsOptions.hasOwnProperty("quality") ?
                 jsOptions["quality"].as<int>() : 1;
    bool linearLayout = jsOptions.hasOwnProperty("linearLayout") ?
                       jsOptions["linearLayout"].as<bool>() : false;
    double componentSeparation = jsOptions.hasOwnProperty("componentSeparation") ?
                                jsOptions["componentSeparation"].as<double>() : 15.0;
    double aspectRatio = jsOptions.hasOwnProperty("aspectRatio") ?
                        jsOptions["aspectRatio"].as<double>() : 1.333333;

    // Create settings
    LayoutSettings settings;
    settings.graphLayoutQuality = quality;
    settings.useLinearLayout = linearLayout;
    settings.componentSeparation = componentSeparation;
    settings.aspectRatio = aspectRatio;

    if (jsOptions.hasOwnProperty("nodeLengthPerMegabase")) {
        settings.autoNodeLengthPerMegabase = jsOptions["nodeLengthPerMegabase"].as<double>();
        settings.manualNodeLengthPerMegabase = jsOptions["nodeLengthPerMegabase"].as<double>();
    }
    if (jsOptions.hasOwnProperty("minimumNodeLength")) {
        settings.minimumNodeLength = jsOptions["minimumNodeLength"].as<double>();
    }
    if (jsOptions.hasOwnProperty("nodeSegmentLength")) {
        settings.nodeSegmentLength = jsOptions["nodeSegmentLength"].as<double>();
    }
    if (jsOptions.hasOwnProperty("edgeLength")) {
        settings.edgeLength = jsOptions["edgeLength"].as<double>();
    }
    if (jsOptions.hasOwnProperty("seed")) {
        settings.randomSeed = jsOptions["seed"].as<int>();
    }

    // Create graph from JavaScript input
    AssemblyGraph* graph = createGraphFromJS(jsGraph);

    // Compute layout
    GraphLayout layoutResult = layout::layoutGraph(*graph, quality, linearLayout,
                                                   componentSeparation, aspectRatio,
                                                   &settings);

    // Convert to JavaScript object
    val result = layoutToJS(layoutResult);

    // Clean up
    delete graph;

    return result;
}

EMSCRIPTEN_BINDINGS(bandage_layout) {
    function("computeLayout", &computeLayout);
}
