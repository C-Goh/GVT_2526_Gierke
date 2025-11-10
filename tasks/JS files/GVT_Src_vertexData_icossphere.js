var oktaeder = (function() {
	let recursionDepth = 0;

	function subdivideTriangle(a, b, c, depth, vertices, indicesTris) {
		if (depth === 0) {
			let startIndex = vertices.length / 3;
			vertices.push(...a, ...b, ...c);
			indicesTris.push(startIndex, startIndex + 1, startIndex + 2);
			return;
		}

		// Mittelpunkt jedes Kantenpaares berechnen und normalisieren
		const ab = normalize(midpoint(a, b));
		const bc = normalize(midpoint(b, c));
		const ca = normalize(midpoint(c, a));

		subdivideTriangle(a, ab, ca, depth - 1, vertices, indicesTris);
		subdivideTriangle(ab, b, bc, depth - 1, vertices, indicesTris);
		subdivideTriangle(ca, bc, c, depth - 1, vertices, indicesTris);
		subdivideTriangle(ab, bc, ca, depth - 1, vertices, indicesTris);
	}

	function midpoint(a, b) {
		return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
	}

	function normalize(v) {
		const len = Math.sqrt(v[0]**2 + v[1]**2 + v[2]**2);
		return [v[0]/len, v[1]/len, v[2]/len];
	}

	function createVertexData(size = 1) {
		const baseVerts = [
			[0,  size/2, 0],
			[0, -size/2, 0],
			[size/2, 0, 0],
			[-size/2, 0, 0],
			[0, 0,  size/2],
			[0, 0, -size/2]
		];

		const faces = [
			[0, 2, 4], [0, 4, 3], [0, 3, 5], [0, 5, 2],
			[1, 4, 2], [1, 3, 4], [1, 5, 3], [1, 2, 5]
		];

		let vertices = [];
		let indicesTris = [];

		for (let f of faces) {
			const a = baseVerts[f[0]];
			const b = baseVerts[f[1]];
			const c = baseVerts[f[2]];
			subdivideTriangle(a, b, c, recursionDepth, vertices, indicesTris);
		}

		this.vertices = new Float32Array(vertices);
		this.normals = new Float32Array(vertices); // Normalen ≈ Positionsvektoren
		this.indicesTris = new Uint16Array(indicesTris);
		this.indicesLines = this.indicesTris; // einfache Darstellung
	}

	function setRecursionDepth(newDepth) {
		recursionDepth = Math.max(0, newDepth);
	}

	function getRecursionDepth() {
		return recursionDepth;
	}

	return {
		createVertexData,
		setRecursionDepth,
		getRecursionDepth
	};
})();