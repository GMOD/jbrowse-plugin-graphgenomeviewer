// Copyright 2022 Anton Korobeynikov
// Copyright 2024 Bandage Layout JS Port

// This file is part of Bandage

// Bandage is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

#pragma once

#include <string>
#include <vector>
#include <unordered_map>
#include <cmath>
#include <algorithm>

// Replace Qt types with standard C++ types

struct Point {
    double x;
    double y;

    Point() : x(0.0), y(0.0) {}
    Point(double x_, double y_) : x(x_), y(y_) {}

    bool operator==(const Point& other) const {
        return x == other.x && y == other.y;
    }
};

// Simple vector replacement for Qt's SmallVector
template<typename T>
using SmallVector = std::vector<T>;

// String type
using String = std::string;

// Helper functions to match Qt behavior
inline std::vector<std::string> split(const std::string& str, char delimiter) {
    std::vector<std::string> result;
    size_t start = 0;
    size_t end = str.find(delimiter);

    while (end != std::string::npos) {
        result.push_back(str.substr(start, end - start));
        start = end + 1;
        end = str.find(delimiter, start);
    }
    result.push_back(str.substr(start));
    return result;
}

inline std::string toLower(const std::string& str) {
    std::string result = str;
    std::transform(result.begin(), result.end(), result.begin(), ::tolower);
    return result;
}

inline std::string toUpper(const std::string& str) {
    std::string result = str;
    std::transform(result.begin(), result.end(), result.begin(), ::toupper);
    return result;
}

inline bool contains(const std::string& str, const std::string& substr) {
    return str.find(substr) != std::string::npos;
}

inline std::string left(const std::string& str, size_t n) {
    return str.substr(0, n);
}

inline std::string right(const std::string& str, size_t n) {
    if (n > str.length()) return str;
    return str.substr(str.length() - n);
}

inline int toInt(const std::string& str, bool* ok = nullptr) {
    try {
        size_t pos;
        int result = std::stoi(str, &pos);
        if (ok) *ok = (pos == str.length());
        return result;
    } catch (...) {
        if (ok) *ok = false;
        return 0;
    }
}

inline double toDouble(const std::string& str, bool* ok = nullptr) {
    try {
        size_t pos;
        double result = std::stod(str, &pos);
        if (ok) *ok = (pos == str.length());
        return result;
    } catch (...) {
        if (ok) *ok = false;
        return 0.0;
    }
}
