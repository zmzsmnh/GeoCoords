var GeoTranslator = function() {
    return this;
};

var a = 6378245.0;
var ee = 0.00669342162296594323;
var pi = 3.14159265358979324;
var x_pi = pi * 3000.0 / 180.0;

// Transform Geo from World Geodetic System to Mars Geodetic System in China
GeoTranslator.wgs2gcj = function(wgLat, wgLon) {
    var dLat = GeoTranslator.transformLat(wgLon - 105.0, wgLat - 35.0);
    var dLon = GeoTranslator.transformLon(wgLon - 105.0, wgLat - 35.0);
    var radLat = wgLat / 180.0 * pi;

    var magic = Math.sin(radLat);
    magic = 1 - ee * magic * magic;
    var SqrtMagic = Math.sqrt(magic);
    dLat = (dLat * 180.0) / ((a * (1 - ee)) / (magic * SqrtMagic) * pi);
    dLon = (dLon * 180.0) / (a / SqrtMagic * Math.cos(radLat) * pi);
    return [wgLat + dLat, wgLon + dLon];
};

// Transform Geo from Mars Geodetic System to World Geodetic System in China
GeoTranslator.gcj2wgs = function(gcLat, gcLon) {
    var a = gcLat;
    var b = gcLon;

    var locs = GeoTranslator.wgs2gcj(a, b);
    if (typeof locs === 'undefined') {
        return undefined;
    }

    var c = 2 * a - locs[0];
    var d = 2 * b - locs[1];
    locs[0] = c;
    locs[1] = d;

    for (var i = 0; i < 4; i++) {
        locs = GeoTranslator.wgs2gcj(locs[0], locs[1]);
        if (typeof locs === 'undefined') {
            return undefined;
        }

        var gap = Math.abs(locs[0] - a) + Math.abs(locs[1] - b);
        locs[0] = c;
        locs[1] = d;
        if (gap < 1e-6) {
            return locs;
        }

        locs = GeoTranslator.search(a, locs, 0);
        if (typeof locs === 'undefined') {
            return undefined;
        }
        locs = GeoTranslator.search(b, locs, 1);
        if (typeof locs === 'undefined') {
            return undefined;
        }
        c = locs[0];
        d = locs[1];
    }

    return locs;
};

// Transform Geo from Mars Geodetic System to Baidu Map System
GeoTranslator.gcj2bd = function(gcLat, gcLon){
	var y = gcLat;
	var x = gcLon;
    var z = Math.sqrt(x * x + y * y) + 0.00002 * Math.sin(y * x_pi);
    var theta = Math.atan2(y, x) + 0.000003 * Math.cos(x * x_pi);
    return [z * Math.sin(theta) + 0.006, z * Math.cos(theta) + 0.0065];
};

// Transform Geo from Baidu Map System to Mars Geodetic System
GeoTranslator.bd2gcj = function(bdLat, bdLon) {
    var x = bdLon - 0.0065;
    var y = bdLat - 0.006;
    var z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * x_pi);
    var theta = Math.atan2(y, x) + 0.000003 * Math.cos(x * x_pi);
    return [z * Math.sin(theta), z * Math.cos(theta)];
};

// Transform Geo from World Geodetic System to Baidu Map System
GeoTranslator.wgs2bd = function(wgLat, wgLon) {
    var locs = GeoTranslator.wgs2gcj(wgLat, wgLon);
    if (typeof locs !== 'undefined') {
        locs = GeoTranslator.gcj2bd(locs[0], locs[1]);
    }
    return locs;
};

// Transform Geo from Baidu Map System to World Geodetic System
GeoTranslator.bd2wgs = function(bdLat, bdLon) {
    var locs = GeoTranslator.bd2gcj(bdLat, bdLon);
    if (typeof locs !== 'undefined') {
        locs = GeoTranslator.gcj2wgs(locs[0], locs[1]);
    }
    return locs;
};

GeoTranslator.transformLat = function(x, y) {
    var ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y *
        y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * pi) + 20.0 *
        Math.sin(2.0 * x * pi)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(y * pi) + 40.0 *
        Math.sin(y / 3.0 * pi)) * 2.0 / 3.0;
    ret += (160.0 * Math.sin(y / 12.0 * pi) + 320 *
        Math.sin(y * pi / 30.0)) * 2.0 / 3.0;
    return ret;
};

GeoTranslator.transformLon = function(x, y) {
    var ret = 300.0 + x + 2.0 * y + 0.1 * x * x +
        0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * pi) + 20.0 *
        Math.sin(2.0 * x * pi)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(x * pi) + 40.0 *
        Math.sin(x / 3.0 * pi)) * 2.0 / 3.0;
    ret += (150.0 * Math.sin(x / 12.0 * pi) + 300.0 *
        Math.sin(x / 30.0 * pi)) * 2.0 / 3.0;
    return ret;
};

GeoTranslator.search = function(a, locs, pos) {
    var c = locs[pos];
    var low = c - 2;
    var high = c + 2;
    var k = locs[1 - pos];
    var mid = low + (high - low) / 2;

    while ((high - low) >= 1e-7) {
        locs[pos] = mid;
        locs = wgs2gcj(locs);

        if (locs == None) {
            return None;
        }

        locs[1 - pos] = k;
        var v = locs[pos];

        if (v > a) {
            high = mid;
            mid = mid - (v - a) * 1.01;
            if (mid <= low) {
                mid = low + (high - low) / 2;
            }
        } else if (v < a) {
            low = mid;
            mid = mid + (a - v) * 1.01;

            if (mid > high) {
                mid = low + (high - low) / 2;
            }
        } else {
            locs[pos] = mid;
            return locs;
        }
    }

    locs[pos] = low + (high - low) / 2;
    return locs;
};

module.exports = GeoTranslator;