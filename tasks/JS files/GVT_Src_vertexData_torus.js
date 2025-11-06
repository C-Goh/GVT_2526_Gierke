var torus = ( function() {
	// Erzeugung des Koerpers
	function createVertexData() {
		var n = 16;
		var m = 32;

		// Positions.
		this.vertices = new Float32Array(3 * (n + 1) * (m + 1));
		var vertices = this.vertices;
		// Normals.
		this.normals = new Float32Array(3 * (n + 1) * (m + 1));
		var normals = this.normals;
		// Index data.
		this.indicesLines = new Uint16Array(2 * 2 * n * m);
		var indicesLines = this.indicesLines;
		this.indicesTris = new Uint16Array(3 * 2 * n * m);
		var indicesTris = this.indicesTris;

		var du = 2 * Math.PI / n;
		var dv = 2 * Math.PI / m;
		var r = 0.1;
		var R = 0.5;
		// Counter for entries in index array.
		var iLines = 0;
		var iTris = 0;

		// Loop angle u.
		for(var i = 0, u = 0; i <= n; i++, u += du) {
			// Loop angle v.
			for(var j = 0, v = 0; j <= m; j++, v += dv) {

				var iVertex = i * (m + 1) + j;

				var x = (R + r * Math.cos(u) ) * Math.cos(v);
				var y = (R + r * Math.cos(u) ) * Math.sin(v);
				var z = r * Math.sin(u);

				// Set vertex positions.
				vertices[iVertex * 3] = x;
				vertices[iVertex * 3 + 1] = y;
				vertices[iVertex * 3 + 2] = z;

				// Calc and set normals.
				var nx = Math.cos(u) * Math.cos(v);
				var ny = Math.cos(u) * Math.sin(v);
				var nz = Math.sin(u);
				normals[iVertex * 3] = nx;
				normals[iVertex * 3 + 1] = ny;
				normals[iVertex * 3 + 2] = nz;

				// if(i>14){
				// continue;
				// }

				// Set index.
				// Line on beam.
				if(j > 0 && i > 0) {
					indicesLines[iLines++] = iVertex - 1;
					indicesLines[iLines++] = iVertex;
				}
				// Line on ring.
				if(j > 0 && i > 0) {
					indicesLines[iLines++] = iVertex - (m + 1);
					indicesLines[iLines++] = iVertex;
				}

				// Set index.
				// Two Triangles.
				if(j > 0 && i > 0) {
					indicesTris[iTris++] = iVertex;
					indicesTris[iTris++] = iVertex - 1;
					indicesTris[iTris++] = iVertex - (m + 1);
					//
					indicesTris[iTris++] = iVertex - 1;
					indicesTris[iTris++] = iVertex - (m + 1) - 1;
					indicesTris[iTris++] = iVertex - (m + 1);
				}
			}
		}
	}

	return {
		createVertexData : createVertexData
	}

}());

var cube = (function() {

	function createVertexData(size = 0.8, position = [0, 0, 0]) {
		const [px, py, pz] = position;
		const s = size / 2; // halbe Höhe und Breite

		// === VERTEX POSITIONEN ===
		// 6 Ecken: oben, unten, vorne, hinten, rechts, links
		this.vertices = new Float32Array([
			px,      py + s, pz,      // 0 - Spitze oben
			px,      py - s, pz,      // 1 - Spitze unten
			px,      py,     pz + s,  // 2 - vorne
			px + s,  py,     pz,      // 3 - rechts
			px,      py,     pz - s,  // 4 - hinten
			px - s,  py,     pz       // 5 - links
		]);

		// === NORMALEN (ungefähr geglättet) ===
		this.normals = new Float32Array([
			0,  1,  0,   // oben
			0, -1,  0,   // unten
			0,  0.5,  1, // vorne
			1,  0.5,  0, // rechts
			0,  0.5, -1, // hinten
			-1, 0.5,  0  // links
		]);

		// Normalisieren aller Normalen
		for (let i = 0; i < this.normals.length; i += 3) {
			let x = this.normals[i];
			let y = this.normals[i + 1];
			let z = this.normals[i + 2];
			let len = Math.sqrt(x * x + y * y + z * z);
			this.normals[i]     = x / len;
			this.normals[i + 1] = y / len;
			this.normals[i + 2] = z / len;
		}

		// === KANTEN (Linien) ===
		this.indicesLines = new Uint16Array([
			0, 2, 0, 3, 0, 4, 0, 5, // obere Pyramide
			1, 2, 1, 3, 1, 4, 1, 5, // untere Pyramide
			2, 3, 3, 4, 4, 5, 5, 2  // Mittelring
		]);

		// === DREIECKE ===
		this.indicesTris = new Uint16Array([
			// obere Hälfte
			0, 2, 3,
			0, 3, 4,
			0, 4, 5,
			0, 5, 2,

			// untere Hälfte
			1, 3, 2,
			1, 4, 3,
			1, 5, 4,
			1, 2, 5
		]);
	}

	return {
		createVertexData: createVertexData
	};
})();

