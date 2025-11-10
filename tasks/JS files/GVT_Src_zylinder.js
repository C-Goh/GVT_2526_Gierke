var cylinder = (function () {

	function createVertexData() {
		var n = 32;       // Segmente um die Z-Achse
		var height = 2;   // Gesamthöhe
		var radius = 1;   // Radius

		// === Mantel ===
		this.vertices = [];
		this.normals = [];
		this.indicesLines = [];
		this.indicesTris = [];

		var du = 2 * Math.PI / n;

		// Mantel: zwei Ringe (oben/unten)
		for (var i = 0; i <= n; i++) {
			var u = i * du;
			var cosU = Math.cos(u);
			var sinU = Math.sin(u);

			// Unterer Punkt
			this.vertices.push(radius * cosU, radius * sinU, -height / 2);
			this.normals.push(cosU, sinU, 0);

			// Oberer Punkt
			this.vertices.push(radius * cosU, radius * sinU, height / 2);
			this.normals.push(cosU, sinU, 0);
		}

		// Indizes für Mantel
		for (var i = 0; i < n; i++) {
			var p0 = i * 2;
			var p1 = p0 + 1;
			var p2 = ((i + 1) % (n + 1)) * 2;
			var p3 = p2 + 1;

			// Linien (Gitternetz)
			this.indicesLines.push(p0, p1);
			this.indicesLines.push(p0, p2);
			this.indicesLines.push(p1, p3);

			// Dreiecke (Mantel)
			this.indicesTris.push(p0, p1, p2);
			this.indicesTris.push(p1, p3, p2);
		}

		// === Deckel: Oben und Unten ===
		var baseIndex = this.vertices.length / 3;

		// Mittelpunkt unten
		this.vertices.push(0, 0, -height / 2);
		this.normals.push(0, 0, -1);
		var centerBottom = baseIndex++;

		// Mittelpunkt oben
		this.vertices.push(0, 0, height / 2);
		this.normals.push(0, 0, 1);
		var centerTop = baseIndex++;

		// Ränder hinzufügen
		for (var i = 0; i <= n; i++) {
			var u = i * du;
			var cosU = Math.cos(u);
			var sinU = Math.sin(u);

			// Rand unten
			this.vertices.push(radius * cosU, radius * sinU, -height / 2);
			this.normals.push(0, 0, -1);

			// Rand oben
			this.vertices.push(radius * cosU, radius * sinU, height / 2);
			this.normals.push(0, 0, 1);
		}

		// Indizes für Böden (Dreiecke)
		for (var i = 0; i < n; i++) {
			var b0 = centerBottom + 1 + i * 2;
			var b1 = centerBottom + 1 + ((i + 1) % n) * 2;
			this.indicesTris.push(centerBottom, b1, b0); // Boden

			var t0 = centerTop + 2 + i * 2;
			var t1 = centerTop + 2 + ((i + 1) % n) * 2;
			this.indicesTris.push(centerTop, t0, t1); // Deckel
		}

		// Float-Arrays erzeugen
		this.vertices = new Float32Array(this.vertices);
		this.normals = new Float32Array(this.normals);
		this.indicesLines = new Uint16Array(this.indicesLines);
		this.indicesTris = new Uint16Array(this.indicesTris);
	}

	return {
		createVertexData: createVertexData
	};

}());
