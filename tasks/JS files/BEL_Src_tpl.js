var app = (function () {

    var gl;

    // The shader program object is also used to
    // store attribute and uniform locations.
    var prog;

    var lightIntensity = 0.3;

    // Array of model objects.
    var models = [];

    // Model that is target for user input.
    var interactiveModel;

    var camera = {
        eye: [0, 1, 4],
        center: [0, 0, 0],
        up: [0, 1, 0],
        fovy: 60.0 * Math.PI / 180,
        lrtb: 2.0,
        vMatrix: mat4.create(),
        pMatrix: mat4.create(),
        projectionType: "perspective",
        zAngle: 0,
        distance: 4,
        aspect: 1.0
    };

    // Szene / Beleuchtung
    var illumination = {
        ambientLight: [.5, .5, .5],
        light: [
            { isOn: true, position: [1., 1., 2.], color: [9., 2., 1.] },
            { isOn: true, position: [-1., 1., -2.], color: [1., 3., 2.] },
        ]
    };

    // Licht-Orbit (kopiert/angepasst aus Referenz)
    var animateLights = false;
    var stepOnce = false;
    var lastTime = 0;
    var stepDt = 0.2;

    var lightOrbit = {
        radius: Math.hypot(illumination.light[0].position[0],
            illumination.light[0].position[2]),
        height: illumination.light[0].position[1],
        speed: Math.PI / 4,
        angle: 0
    };

    var useToon = false;           // Start mit Phong
    var toonLevels = 4;            // Anzahl Helligkeitsbänder
    var toonSpecThreshold = 0.5;   // Schwellwert fürs Highlight-Band

    function updateLights(dt) {
        lightOrbit.angle += lightOrbit.speed * dt;
        var a = lightOrbit.angle;
        var r = lightOrbit.radius;
        var y = lightOrbit.height;

        illumination.light[0].position[0] = r * Math.cos(a);
        illumination.light[0].position[2] = r * Math.sin(a);
        illumination.light[0].position[1] = y;

        illumination.light[1].position[0] = r * Math.cos(a + Math.PI);
        illumination.light[1].position[2] = r * Math.sin(a + Math.PI);
        illumination.light[1].position[1] = y;
    }

    function loop(time) {
        var dt = lastTime ? (time - lastTime) / 1000.0 : 0.0;
        lastTime = time;

        if (animateLights) {
            updateLights(dt);
        } else if (stepOnce) {
            updateLights(stepDt);
            stepOnce = false;
        }

        render();
        requestAnimationFrame(loop);
    }

    function start() {
        init();
        requestAnimationFrame(loop);
    }

    function init() {
        initWebGL();
        initShaderProgram();
        initUniforms();
        initModels();
        initEventHandler();
        initPipline();
    }

    function initWebGL() {
        canvas = document.getElementById('canvas');
        gl = canvas.getContext('experimental-webgl') || canvas.getContext('webgl');
        if (!gl) {
            alert("WebGL nicht verfügbar");
            return;
        }
        gl.viewportWidth = canvas.width;
        gl.viewportHeight = canvas.height;
    }

    function initPipline() {
        gl.clearColor(.95, .95, .95, 1);
        gl.frontFace(gl.CCW);
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.POLYGON_OFFSET_FILL);
        gl.polygonOffset(0.5, 0);
        gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
        camera.aspect = gl.viewportWidth / gl.viewportHeight;
    }

    function initShaderProgram() {
        // Wir verwenden die Standard-Vertex- & Fragment-Shader aus HTML
        var vs = initShader(gl.VERTEX_SHADER, "vertexshader");
        var fs = initShader(gl.FRAGMENT_SHADER, "fragmentshader");
        prog = gl.createProgram();
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.bindAttribLocation(prog, 0, "aPosition");
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.log("Shader Link-Error: " + gl.getProgramInfoLog(prog));
        }
        gl.useProgram(prog);
    }

    function initShader(shaderType, SourceTagId) {
        var shader = gl.createShader(shaderType);
        var shaderSource = document.getElementById(SourceTagId).text;
        gl.shaderSource(shader, shaderSource);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.log(SourceTagId + ": " + gl.getShaderInfoLog(shader));
            return null;
        }
        return shader;
    }

    function initUniforms() {
        prog.pMatrixUniform = gl.getUniformLocation(prog, "uPMatrix");
        prog.mvMatrixUniform = gl.getUniformLocation(prog, "uMVMatrix");
        prog.nMatrixUniform = gl.getUniformLocation(prog, "uNMatrix");
        prog.colorUniform = gl.getUniformLocation(prog, "uColor");

        prog.ambientLightUniform = gl.getUniformLocation(prog, "ambientLight");

        prog.lightUniform = [];
        for (var j = 0; j < illumination.light.length; j++) {
            var lightNb = "light[" + j + "]";
            var l = {};
            l.isOn = gl.getUniformLocation(prog, lightNb + ".isOn");
            l.position = gl.getUniformLocation(prog, lightNb + ".position");
            l.color = gl.getUniformLocation(prog, lightNb + ".color");
            prog.lightUniform[j] = l;
        }

        prog.materialKaUniform = gl.getUniformLocation(prog, "material.ka");
        prog.materialKdUniform = gl.getUniformLocation(prog, "material.kd");
        prog.materialKsUniform = gl.getUniformLocation(prog, "material.ks");
        prog.materialKeUniform = gl.getUniformLocation(prog, "material.ke");

        prog.useToonUniform = gl.getUniformLocation(prog, "useToon");
        prog.toonLevelsUniform = gl.getUniformLocation(prog, "uToonLevels");
        prog.toonSpecThresholdUniform = gl.getUniformLocation(prog, "uSpecThreshold");
    }

    function createPhongMaterial(material) {
        material = material || {};
        material.ka = material.ka || [0.3, 0.3, 0.3];
        material.kd = material.kd || [0.6, 0.6, 0.6];
        material.ks = material.ks || [0.8, 0.8, 0.8];
        material.ke = material.ke || 10.;
        return material;
    }

    function initModels() {
        var fs = "fill";
        var mYellow = createPhongMaterial({ ka: [1., 1., 0.], kd: [1., 1., 0.], ks: [0.3, 0.3, 0.] });
        var mBlue = createPhongMaterial({ ka: [0., 0., 1.], kd: [0., 0., 1.], ks: [0.2, 0.2, 0.5] });
        var mWhite = createPhongMaterial({ ka: [1., 1., 1.], kd: [.5, .5, .5], ks: [0., 0., 0.] });

        createModel("torus", fs, [1, 1, 1, 1], [0, .75, 0], [0, 0, 0], [1, 1, 1], mBlue);
        createModel("sphere", fs, [1, 1, 1, 1], [-1.25, .5, 0], [0, 0, 0], [.5, .5, .5], mYellow);
        createModel("sphere", fs, [1, 1, 1, 1], [1.25, .5, 0], [0, 0, 0], [.5, .5, .5], mYellow);

        createModel("plane", fs, [1, 1, 1, 1], [0, 0, 0], [0, 0, 0], [1, 1, 1], mWhite);

        interactiveModel = models[0];
    }

    function createModel(geometryname, fillstyle, color, translate, rotate, scale, material) {
        var model = {};
        model.fillstyle = fillstyle;
        model.color = color;
        initDataAndBuffers(model, geometryname);
        initTransformations(model, translate, rotate, scale);
        model.material = material;
        models.push(model);
    }

    function initTransformations(model, translate, rotate, scale) {
        model.translate = translate;
        model.rotate = rotate;
        model.scale = scale;
        model.mMatrix = mat4.create();
        model.mvMatrix = mat4.create();
        model.nMatrix = mat3.create();
    }

    function initDataAndBuffers(model, geometryname) {
        this[geometryname]['createVertexData'].apply(model);

        model.vboPos = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, model.vboPos);
        gl.bufferData(gl.ARRAY_BUFFER, model.vertices, gl.STATIC_DRAW);
        prog.positionAttrib = gl.getAttribLocation(prog, 'aPosition');
        gl.enableVertexAttribArray(prog.positionAttrib);

        model.vboNormal = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, model.vboNormal);
        gl.bufferData(gl.ARRAY_BUFFER, model.normals, gl.STATIC_DRAW);
        prog.normalAttrib = gl.getAttribLocation(prog, 'aNormal');
        gl.enableVertexAttribArray(prog.normalAttrib);

        model.iboLines = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.iboLines);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, model.indicesLines, gl.STATIC_DRAW);
        model.iboLines.numberOfElements = model.indicesLines.length;
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

        model.iboTris = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.iboTris);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, model.indicesTris, gl.STATIC_DRAW);
        model.iboTris.numberOfElements = model.indicesTris.length;
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    }

    function initEventHandler() {
        var deltaRotate = Math.PI / 36;
        var deltaTranslate = 0.05;
        var deltaScale = 0.05;

        window.onkeydown = function (evt) {
            var key = evt.which ? evt.which : evt.keyCode;
            var c = String.fromCharCode(key);
            var sign = evt.shiftKey ? -1 : 1;

            switch (c) {
                case ('O'):
                    camera.projectionType = "ortho";
                    camera.lrtb = 2;
                    break;
                case ('F'):
                    camera.projectionType = "frustum";
                    camera.lrtb = 1.2;
                    break;
                case ('P'):
                    camera.projectionType = "perspective";
                    break;
            }

            switch (c) {
                case ('C'):
                    camera.zAngle += sign * deltaRotate;
                    break;
                case ('H'):
                    camera.eye[1] += sign * deltaTranslate;
                    break;
                case ('D'):
                    camera.distance += sign * deltaTranslate;
                    break;
                case ('V'):
                    camera.fovy += sign * 5 * Math.PI / 180;
                    break;
                case ('B'):
                    camera.lrtb += sign * 0.1;
                    break;
            }

            switch (c) {
                case ('R'):
                    animateLights = !animateLights;
                    break;
                case ('T'):
                    useToon = !useToon;
                    break;
                case ('L'):
                    if (!animateLights) stepOnce = true;
                    break;
            }

            render();
        };
    }

    function render() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        setProjection();
        calculateCameraOrbit();

        mat4.lookAt(camera.vMatrix, camera.eye, camera.center, camera.up);

        // Set light uniforms
        gl.uniform3fv(prog.ambientLightUniform, illumination.ambientLight);
        for (var j = 0; j < illumination.light.length; j++) {
            gl.uniform1i(prog.lightUniform[j].isOn, illumination.light[j].isOn ? 1 : 0);

            var lightPos = [].concat(illumination.light[j].position);
            lightPos.push(1.0);
            vec4.transformMat4(lightPos, lightPos, camera.vMatrix);
            lightPos.pop();
            gl.uniform3fv(prog.lightUniform[j].position, lightPos);
            gl.uniform3fv(
                prog.lightUniform[j].color,
                [
                    illumination.light[j].color[0] * lightIntensity,
                    illumination.light[j].color[1] * lightIntensity,
                    illumination.light[j].color[2] * lightIntensity
                ]
            );

        }

        for (var i = 0; i < models.length; i++) {
            updateTransformations(models[i]);

            gl.uniformMatrix4fv(prog.mvMatrixUniform, false, models[i].mvMatrix);
            gl.uniformMatrix3fv(prog.nMatrixUniform, false, models[i].nMatrix);

            gl.uniform4fv(prog.colorUniform, models[i].color);

            gl.uniform3fv(prog.materialKaUniform, models[i].material.ka);
            gl.uniform3fv(prog.materialKdUniform, models[i].material.kd);
            gl.uniform3fv(prog.materialKsUniform, models[i].material.ks);
            gl.uniform1f(prog.materialKeUniform, models[i].material.ke);

            gl.uniform1i(prog.useToonUniform, useToon ? 1 : 0);
            gl.uniform1i(prog.toonLevelsUniform, toonLevels);
            gl.uniform1f(prog.toonSpecThresholdUniform, toonSpecThreshold);

            draw(models[i]);
        }
    }

    function calculateCameraOrbit() {
        var x = 0, z = 2;
        camera.eye[x] = camera.center[x];
        camera.eye[z] = camera.center[z];
        camera.eye[x] += camera.distance * Math.sin(camera.zAngle);
        camera.eye[z] += camera.distance * Math.cos(camera.zAngle);
    }

    function setProjection() {
        switch (camera.projectionType) {
            case ("ortho"):
                var v = camera.lrtb;
                mat4.ortho(camera.pMatrix, -v, v, -v, v, -10, 100);
                break;
            case ("frustum"):
                var v = camera.lrtb;
                mat4.frustum(camera.pMatrix, -v / 2, v / 2, -v / 2, v / 2, 1, 10);
                break;
            case ("perspective"):
                mat4.perspective(camera.pMatrix, camera.fovy, camera.aspect, 1, 10);
                break;
        }
        gl.uniformMatrix4fv(prog.pMatrixUniform, false, camera.pMatrix);
    }

    function updateTransformations(model) {
        var mMatrix = model.mMatrix;
        var mvMatrix = model.mvMatrix;
        mat4.identity(mMatrix);
        mat4.identity(mvMatrix);
        mat4.translate(mMatrix, mMatrix, model.translate);
        mat4.rotateX(mMatrix, mMatrix, model.rotate[0]);
        mat4.rotateY(mMatrix, mMatrix, model.rotate[1]);
        mat4.rotateZ(mMatrix, mMatrix, model.rotate[2]);
        mat4.scale(mMatrix, mMatrix, model.scale);
        mat4.multiply(mvMatrix, camera.vMatrix, mMatrix);
        mat3.normalFromMat4(model.nMatrix, mvMatrix);
    }

    function draw(model) {
        gl.bindBuffer(gl.ARRAY_BUFFER, model.vboPos);
        gl.vertexAttribPointer(prog.positionAttrib, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, model.vboNormal);
        gl.vertexAttribPointer(prog.normalAttrib, 3, gl.FLOAT, false, 0, 0);

        var fill = (model.fillstyle.search(/fill/) != -1);
        if (fill) {
            gl.enableVertexAttribArray(prog.normalAttrib);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.iboTris);
            gl.drawElements(gl.TRIANGLES, model.iboTris.numberOfElements, gl.UNSIGNED_SHORT, 0);
        }

        var wireframe = (model.fillstyle.search(/wireframe/) != -1);
        if (wireframe) {
            gl.uniform4fv(prog.colorUniform, [0., 0., 0., 1.]);
            gl.disableVertexAttribArray(prog.normalAttrib);
            gl.vertexAttrib3f(prog.normalAttrib, 0, 0, 0);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.iboLines);
            gl.drawElements(gl.LINES, model.iboLines.numberOfElements, gl.UNSIGNED_SHORT, 0);
        }
    }

    return {
        start: start
    };

}());
