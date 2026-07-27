// Copyright 2017 Ryan Wick
// Copyright 2024 Bandage Layout JS Port

// This file is part of Bandage

// Bandage is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

#pragma once

// Simplified settings structure for layout computation only
// Removes all Qt and GUI-related settings

enum NodeLengthMode {
    AUTO_NODE_LENGTH,
    MANUAL_NODE_LENGTH
};

struct LayoutSettings {
    // Node length settings
    NodeLengthMode nodeLengthMode = AUTO_NODE_LENGTH;
    double autoNodeLengthPerMegabase = 1000.0;
    double manualNodeLengthPerMegabase = 1000.0;
    double minimumNodeLength = 1.0;
    double nodeSegmentLength = 1.0;

    // Edge settings
    double edgeLength = 1.0;

    // Layout quality (0-4)
    int graphLayoutQuality = 1;

    // Linear layout mode
    bool useLinearLayout = false;

    // Component separation
    double componentSeparation = 15.0;

    // Aspect ratio
    double aspectRatio = 1.333333;

    // FMMM's random seed. Fixed by default: the same graph laid out twice has
    // to give the same picture, or every screenshot of a force-directed layout
    // differs from the last one by a couple of percent.
    int randomSeed = 1;

    LayoutSettings() = default;
};

// Global settings instance (will be passed as parameter in WASM)
extern LayoutSettings* g_layoutSettings;

inline double getNodeLengthPerMegabase(const LayoutSettings* settings) {
    if (settings->nodeLengthMode == AUTO_NODE_LENGTH)
        return settings->autoNodeLengthPerMegabase;
    return settings->manualNodeLengthPerMegabase;
}

inline double getDrawnNodeLength(const LayoutSettings* settings, unsigned nodeLength) {
    double drawnNodeLength = getNodeLengthPerMegabase(settings) * double(nodeLength) / 1000000.0;
    if (drawnNodeLength < settings->minimumNodeLength)
        drawnNodeLength = settings->minimumNodeLength;
    return drawnNodeLength;
}

inline int getNumberOfOgdfGraphEdges(const LayoutSettings* settings, double drawnNodeLength) {
    int numberOfGraphEdges = ceil(drawnNodeLength / settings->nodeSegmentLength);
    if (numberOfGraphEdges <= 0)
        numberOfGraphEdges = 1;
    return numberOfGraphEdges;
}
