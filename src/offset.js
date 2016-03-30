var GreinerHormann = require('greiner-hormann');
var Edge = require('./edge');
var intersection = require('./intersection');

"use strict";

var min = Math.min,
    max = Math.max,
    atan2 = Math.atan2;

/**
 * Offset builder
 *
 * @param {Array.<Object>=} vertices
 * @param {Number=}        arcSegments
 * @constructor
 */
function Offset(vertices, arcSegments) {

    /**
     * @type {Array.<Object>}
     */
    this.vertices = null;

    /**
     * @type {Array.<Edge>}
     */
    this.edges = null;

    /**
     * @type {Boolean}
     */
    this._closed = false;

    if (vertices) {
        this.data(vertices);
    }

    /**
     * Segments in edge bounding arches
     * @type {Number}
     */
    this._arcSegments = arcSegments || 5;
};

/**
 * Change data set
 * @param  {Array.<Array>} vertices
 * @return {Offset}
 */
Offset.prototype.data = function(vertices) {
    vertices = this.validate(vertices);

    var edges = [];
    for (var i = 0, len = vertices.length; i < len; i++) {
        edges.push(new Edge(vertices[i], vertices[(i + 1) % len]));
    }

    this.vertices = vertices;
    this.edges = edges;
    return this;
};

/**
 * @param  {Number} arcSegments
 * @return {Offset}
 */
Offset.prototype.arcSegments = function(arcSegments) {
    this._arcSegments = arcSegments;
    return this;
};

/**
 * Validates if the first and last points repeat
 * TODO: check CCW
 *
 * @param  {Array.<Object>} vertices
 */
Offset.prototype.validate = function(vertices) {
    var len = vertices.length;
    if (vertices[0].x === vertices[len - 1].x &&
        vertices[0].y === vertices[len - 1].y) {
        vertices = vertices.slice(0, len - 1);
        this._closed = true;
    }
    return vertices;
};

/**
 * Creates arch between two edges
 *
 * @param  {Array.<Object>} vertices
 * @param  {Object}         center
 * @param  {Number}         radius
 * @param  {Object}         startVertex
 * @param  {Object}         endVertex
 * @param  {Number}         segments
 * @param  {Boolean}        outwards
 */
Offset.prototype.createArc = function(vertices, center, radius, startVertex,
    endVertex, segments, outwards) {

    var PI2 = Math.PI * 2,
        startAngle = atan2(startVertex.y - center.y, startVertex.x - center.x),
        endAngle = atan2(endVertex.y - center.y, endVertex.x - center.x);

    // odd number please
    if (segments % 2 === 0) {
        segments -= 1;
    }

    if (startAngle < 0) {
        startAngle += PI2;
    }

    if (endAngle < 0) {
        endAngle += PI2;
    }

    var angle = ((startAngle > endAngle) ?
            (startAngle - endAngle) :
            (startAngle + PI2 - endAngle)),
        segmentAngle = ((outwards) ? -angle : PI2 - angle) / segments;

    vertices.push(startVertex);
    for (var i = 1; i < segments; ++i) {
        angle = startAngle + segmentAngle * i;
        vertices.push({
            x: center.x + Math.cos(angle) * radius,
            y: center.y + Math.sin(angle) * radius
        });
    }
    vertices.push(endVertex);
};

/**
 * Create padding polygon
 *
 * @param  {Number} distance
 * @return {Array.<Number>}
 */
Offset.prototype.padding = function(dist) {
    var offsetEdges = [],
        vertices = [],
        i, len, union;

    for (i = 0, len = this.edges.length; i < len; i++) {
        var edge = this.edges[i],
            dx = edge._outNormal.x * dist,
            dy = edge._outNormal.y * dist;
        offsetEdges.push(edge.offset(dx, dy));
    }

    for (i = 0, len = offsetEdges.length; i < len; i++) {
        var thisEdge = offsetEdges[i],
            prevEdge = offsetEdges[(i + len - 1) % len],
            vertex = intersection(
                prevEdge.current,
                prevEdge.next,
                thisEdge.current,
                thisEdge.next);

        if (vertex)
            vertices.push(vertex);
        else {
            this.createArc(
                vertices,
                this.edges[i].current,
                dist,
                prevEdge.next,
                thisEdge.current,
                this._arcSegments,
                false);
        }
    }
    union = GreinerHormann.union(vertices, vertices);
    vertices = union ? union[0] : vertices;

    vertices = this.ensureLastPoint(vertices);
    return vertices;
};

/**
 * Creates margin polygon
 * @param  {Number} dist
 * @return {Array.<Object>}
 */
Offset.prototype.margin = function(dist) {
    var offsetEdges = [],
        vertices = [],
        i, len, union;
    for (i = 0, len = this.edges.length; i < len; i++) {
        var edge = this.edges[i],
            dx = edge._inNormal.x * dist,
            dy = edge._inNormal.y * dist;

        offsetEdges.push(edge.offset(dx, dy));
    }

    for (i = 0, len = offsetEdges.length; i < len; i++) {
        var thisEdge = offsetEdges[i],
            prevEdge = offsetEdges[(i + len - 1) % len],
            vertex = intersection(
                prevEdge.current,
                prevEdge.next,
                thisEdge.current,
                thisEdge.next
            );

        if (vertex) {
            vertices.push(vertex);
        } else {
            this.createArc(
                vertices,
                this.edges[i].current,
                dist,
                prevEdge.next,
                thisEdge.current,
                this._arcSegments,
                true
            );
        }
    }

    union = GreinerHormann.union(vertices, vertices);
    if (union) {
        vertices = union[0];
    }

    vertices = this.ensureLastPoint(vertices);
    return vertices;
};

/**
 * @param  {Array.<Object>} vertices
 * @return {Array.<Object>}
 */
Offset.prototype.ensureLastPoint = function(vertices) {
    if (this._closed) {
        vertices.push({
            x: vertices[0].x,
            y: vertices[0].y
        });
    }
    return vertices;
};

/**
 * Decides by the sign if it's a padding or a margin
 *
 * @param  {Number} dist
 * @return {Array.<Object>}
 */
Offset.prototype.offset = function(dist) {
    return dist === 0 ?
        this.vertices :
        (dist > 0 ? this.margin(dist) : this.padding(-dist));
};

module.exports = Offset;
