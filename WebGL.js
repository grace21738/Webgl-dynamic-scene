var VSHADER_SOURCE = `
    attribute vec4 a_Position;
    attribute vec4 a_Normal;
    attribute vec2 a_TexCoord;

    uniform mat4 u_MvpMatrix;
    uniform mat4 u_modelMatrix;
    uniform mat4 u_normalMatrix;
    //uniform float isBump;

    attribute vec3 a_Tagent;
    attribute vec3 a_Bitagent;
    attribute float a_crossTexCoord;

    varying vec3 v_Normal;
    varying vec3 v_PositionInWorld;
    varying vec2 v_TexCoord;
     varying mat4 v_TBN;
    
    void main(){
        gl_Position = u_MvpMatrix * a_Position;
        v_PositionInWorld = (u_modelMatrix * a_Position).xyz; 
        v_Normal = normalize(vec3(u_normalMatrix * a_Normal));
        v_TexCoord = a_TexCoord;
  
        //create TBN matrix 
        vec3 tagent = normalize(a_Tagent);
        vec3 bitagent = normalize(a_Bitagent);
        vec3 nVector;
        if( a_crossTexCoord > 0.0){
          nVector = cross(tagent, bitagent);
        } else{
          nVector = cross(bitagent, tagent);
        }
        v_TBN = mat4(tagent.x, tagent.y, tagent.z, 0.0, 
                           bitagent.x, bitagent.y, bitagent.z, 0.0,
                           nVector.x, nVector.y, nVector.z, 0.0, 
                           0.0, 0.0, 0.0, 1.0);
    }    
`;

var FSHADER_SOURCE = `
    precision mediump float;
    uniform vec3 u_LightPosition;
    uniform vec3 u_ViewPosition;
    uniform float u_Ka;
    uniform float u_Kd;
    uniform float u_Ks;
    uniform float u_shininess;
    uniform float isTexture;
    uniform vec3 u_Color;
    uniform sampler2D u_Sampler;
    uniform sampler2D u_Sampler0;

    uniform highp mat4 u_normalMatrix;
    uniform float isBump;
    varying mat4 v_TBN;

    varying vec3 v_Normal;
    varying vec3 v_PositionInWorld;
    varying vec2 v_TexCoord;
    //varying float f_isBump
    void main(){
        // let ambient and diffuse color are u_Color 
        // (you can also input them from ouside and make them different)
        vec3 texColor;
        vec3 ambientLightColor;
        vec3 diffuseLightColor;
        
        if( isTexture > 0.0 ){
            if( isBump > 0.0){
              vec3 texColor0 = texture2D( u_Sampler, v_TexCoord ).rgb;
              vec3 texColor1 = texture2D( u_Sampler0, v_TexCoord ).rgb;
              texColor = texColor0 * 0.9 + texColor1* 0.1 ;
            }
            else{
              texColor = texture2D( u_Sampler, v_TexCoord ).rgb;
            }
            ambientLightColor = texColor;
            diffuseLightColor = texColor;
        }
        else{
              ambientLightColor = u_Color;
              diffuseLightColor = u_Color;
        }
      
        // assume white specular light (you can also input it from ouside)
        vec3 specularLightColor = vec3(1.0, 1.0, 1.0);        

        vec3 ambient = ambientLightColor * u_Ka;
        vec3 normal;
        vec3 nMapNormal;
        if( isBump > 0.0 ){
          nMapNormal = normalize( texture2D( u_Sampler0,v_TexCoord ).rgb * 2.0 - 1.0 );
          normal = normalize(normalize( vec3( u_normalMatrix * v_TBN * vec4( nMapNormal, 1.0) ))*normalize(v_Normal));
        }
        else{
          normal = normalize(v_Normal);
        }

        vec3 lightDirection = normalize(u_LightPosition - v_PositionInWorld);
        float nDotL = max(dot(lightDirection, normal), 0.0);
        vec3 diffuse = diffuseLightColor * u_Kd * nDotL;

        vec3 specular = vec3(0.1, 0.1, 0.0);
        if(nDotL > 0.0) {
            vec3 R = reflect(-lightDirection, normal);
            // V: the vector, point to viewer       
            vec3 V = normalize(u_ViewPosition - v_PositionInWorld); 
            float specAngle = clamp(dot(R, V), 0.0, 1.0);
            specular = u_Ks * pow(specAngle, u_shininess) * specularLightColor; 
        }
        
        gl_FragColor = vec4( ambient + diffuse + specular, 1.0 );
    }
`;

var VSHADER_SOURCE_ENVCUBE = `
  attribute vec4 a_Position;
  varying vec4 v_Position;
  void main() {
    v_Position = a_Position;
    gl_Position = a_Position;
  } 
`;

var FSHADER_SOURCE_ENVCUBE = `
  precision mediump float;
  uniform samplerCube u_envCubeMap;
  uniform mat4 u_viewDirectionProjectionInverse;
  varying vec4 v_Position;
  void main() {
    //v_Position ->clip space => u_viewDirectionProjectionInverse -> proMatirx * veiwMatrix
    vec4 t = u_viewDirectionProjectionInverse * v_Position;

    gl_FragColor = textureCube(u_envCubeMap, normalize(t.xyz / t.w));
  }
`;

var VSHADER_REFLECT_SOURCE = `
    attribute vec4 a_Position;
    attribute vec4 a_Normal;
    uniform mat4 u_MvpMatrix;
    uniform mat4 u_modelMatrix;
    uniform mat4 u_normalMatrix;
    varying vec3 v_Normal;
    varying vec3 v_PositionInWorld;
    void main(){
        gl_Position = u_MvpMatrix * a_Position;
        v_PositionInWorld = (u_modelMatrix * a_Position).xyz; 
        v_Normal = normalize(vec3(u_normalMatrix * a_Normal));
    }    
`;

var FSHADER_REFLECT_SOURCE = `
    precision mediump float;
    uniform vec3 u_ViewPosition;
    uniform samplerCube u_envCubeMap;
    varying vec3 v_Normal;
    varying vec3 v_PositionInWorld;
    void main(){
      float ratio = 1.00 / 1.1; //glass
      vec3 V = normalize(u_ViewPosition - v_PositionInWorld); 
      vec3 normal = normalize(v_Normal);
      vec3 R = refract(-V, normal, ratio);
      gl_FragColor = vec4(textureCube(u_envCubeMap, R).rgb, 1.0);
    }
`;

var VSHADER_SOURCE_TEXTURE_ON_CUBE = `
  attribute vec4 a_Position;
  attribute vec4 a_Normal;
  uniform mat4 u_MvpMatrix;
  uniform mat4 u_modelMatrix;
  uniform mat4 u_normalMatrix;
  varying vec4 v_TexCoord;
  varying vec3 v_Normal;
  varying vec3 v_PositionInWorld;
  void main() {
    gl_Position = u_MvpMatrix * a_Position;
    v_TexCoord = a_Position;
    v_PositionInWorld = (u_modelMatrix * a_Position).xyz; 
    v_Normal = normalize(vec3(u_normalMatrix * a_Normal));
  } 
`;

var FSHADER_SOURCE_TEXTURE_ON_CUBE = `
  precision mediump float;
  varying vec4 v_TexCoord;
  uniform vec3 u_ViewPosition;
  uniform vec3 u_Color;
  uniform samplerCube u_envCubeMap;
  varying vec3 v_Normal;
  varying vec3 v_PositionInWorld;
  void main() {
    vec3 V = normalize(u_ViewPosition - v_PositionInWorld); 
    vec3 normal = normalize(v_Normal);
    vec3 R = reflect(-V, normal);
    gl_FragColor = vec4(0.78 * textureCube(u_envCubeMap, R).rgb + 0.3 * u_Color, 1.0);
  }
`;


function compileShader(gl, vShaderText, fShaderText){
    //////Build vertex and fragment shader objects
    var vertexShader = gl.createShader(gl.VERTEX_SHADER)
    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)
    //The way to  set up shader text source
    gl.shaderSource(vertexShader, vShaderText)
    gl.shaderSource(fragmentShader, fShaderText)
    //compile vertex shader
    gl.compileShader(vertexShader)
    if(!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)){
        console.log('vertex shader ereror');
        var message = gl.getShaderInfoLog(vertexShader); 
        console.log(message);//print shader compiling error message
    }
    //compile fragment shader
    gl.compileShader(fragmentShader)
    if(!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)){
        console.log('fragment shader ereror');
        var message = gl.getShaderInfoLog(fragmentShader);
        console.log(message);//print shader compiling error message
    }

    /////link shader to program (by a self-define function)
    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    //if not success, log the program info, and delete it.
    if(!gl.getProgramParameter(program, gl.LINK_STATUS)){
        alert(gl.getProgramInfoLog(program) + "");
        gl.deleteProgram(program);
    }

    return program;
}

/////BEGIN:///////////////////////////////////////////////////////////////////////////////////////////////
/////The folloing three function is for creating vertex buffer, but link to shader to user later//////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////
function initAttributeVariable(gl, a_attribute, buffer){
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.vertexAttribPointer(a_attribute, buffer.num, buffer.type, false, 0, 0);
  gl.enableVertexAttribArray(a_attribute);
}

function initArrayBufferForLaterUse(gl, data, num, type) {
  // Create a buffer object
  var buffer = gl.createBuffer();
  if (!buffer) {
    console.log('Failed to create the buffer object');
    return null;
  }
  // Write date into the buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

  // Store the necessary information to assign the object to the attribute variable later
  buffer.num = num;
  buffer.type = type;

  return buffer;
}

function initVertexBufferForLaterUse(gl, vertices, normals, texCoords){
  var nVertices = vertices.length / 3;

  var o = new Object();
  o.vertexBuffer = initArrayBufferForLaterUse(gl, new Float32Array(vertices), 3, gl.FLOAT);
  if( normals != null ) o.normalBuffer = initArrayBufferForLaterUse(gl, new Float32Array(normals), 3, gl.FLOAT);
  if( texCoords != null ) o.texCoordBuffer = initArrayBufferForLaterUse(gl, new Float32Array(texCoords), 2, gl.FLOAT);
  //you can have error check here
  o.numVertices = nVertices;

  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

  return o;
}

function BBinitVertexBufferForLaterUse(gl, vertices, normals, texCoords, tagents, bitagents, crossTexCoords){
  var nVertices = vertices.length / 3;

  var o = new Object();
  o.vertexBuffer = initArrayBufferForLaterUse(gl, new Float32Array(vertices), 3, gl.FLOAT);
  if( normals != null ) o.normalBuffer = initArrayBufferForLaterUse(gl, new Float32Array(normals), 3, gl.FLOAT);
  if( texCoords != null ) o.texCoordBuffer = initArrayBufferForLaterUse(gl, new Float32Array(texCoords), 2, gl.FLOAT);
  if( tagents != null ) o.tagentsBuffer = initArrayBufferForLaterUse(gl, new Float32Array(tagents), 3, gl.FLOAT);
  if( bitagents != null ) o.bitagentsBuffer = initArrayBufferForLaterUse(gl, new Float32Array(bitagents), 3, gl.FLOAT);
  if( crossTexCoords != null ) o.crossTexCoordsBuffer = initArrayBufferForLaterUse(gl, new Float32Array(crossTexCoords), 1, gl.FLOAT);
  //you can have error check here
  o.numVertices = nVertices;

  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

  return o;
}
/////END://///////////////////////////////////////////////////////////////////////////////////////////////
/////The folloing three function is for creating vertex buffer, but link to shader to user later//////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////


//////////////////////////// normal vector calculation (for the cube)
function getNormalOnVertices(vertices){
  var normals = [];
  var nTriangles = vertices.length/9;
  for(let i=0; i < nTriangles; i ++ ){
      var idx = i * 9 + 0 * 3;
      var p0x = vertices[idx+0], p0y = vertices[idx+1], p0z = vertices[idx+2];
      idx = i * 9 + 1 * 3;
      var p1x = vertices[idx+0], p1y = vertices[idx+1], p1z = vertices[idx+2];
      idx = i * 9 + 2 * 3;
      var p2x = vertices[idx+0], p2y = vertices[idx+1], p2z = vertices[idx+2];

      var ux = p1x - p0x, uy = p1y - p0y, uz = p1z - p0z;
      var vx = p2x - p0x, vy = p2y - p0y, vz = p2z - p0z;

      var nx = uy*vz - uz*vy;
      var ny = uz*vx - ux*vz;
      var nz = ux*vy - uy*vx;

      var norm = Math.sqrt(nx*nx + ny*ny + nz*nz);
      nx = nx / norm;
      ny = ny / norm;
      nz = nz / norm;

      normals.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
  }
  return normals;
}



var mouseLastX, mouseLastY;
var mouseDragging = false;
var isChange = true;
var angleX = 0, angleY = 0;
var gl, canvas;
var mvpMatrix;
var modelMatrix;
var normalMatrix;
var nVertex;
var cameraX = 0, cameraY = 0, cameraZ = 7;

var booX = 0.0, booZ = 0.0;
var cX = -15, cY = 1, cZ = 25;
var cameraDirX = 0, cameraDirY = 0, cameraDirZ = 1;
var CcameraDirX = 1, CcameraDirY = 0, CcameraDirZ = -1;

var airplane = [];
var camero = [];
var cube = [];
var camp = [];
var boo = [];
var shy = [];
var snowflake = [];
var reflectCube = [];
var crystal = [];
var reflectNum = 0;


var Ptextures = {};
var PimgNames = ["glass.png","Interior.png","Main_body.png","Main_body_2.png"];
var PobjCompImgIndex = ["glass.png","Interior.png","Main_body.png","Main_body_2.png"];
var PtexCount = 0;
var PnumTextures = PimgNames.length;

var Ctextures = {};
var CimgNames = ["camero.png"];
var CobjCompImgIndex = ["camero.png"];
var CtexCount = 0;
var CnumTextures = CimgNames.length;

var Gtextures = {};
var GimgNames = ["MAIN1.jpg"];
var GobjCompImgIndex = ["MAIN1.jpg"];
var GtexCount = 0;
var GnumTextures = GimgNames.length;

var CAtextures = {};
var CAimgNames = ["utensilrope_diffuse.jpg","camp_diffuse.jpg","woodsground_diffuse.jpg","rocks_diffuse.jpg"
,"woodsground_glow.jpg"];
var CAobjCompImgIndex = ["utensilrope_diffuse.jpg","camp_diffuse.jpg","woodsground_diffuse.jpg","rocks_diffuse.jpg",
"woodsground_glow.jpg"];
var CAtexCount = 0;
var CAnumTextures = CAimgNames.length;

var NNtextures = {};
var NNimgNames = ["utensilrope_normal.jpg","camp_normal.jpg","woodsground_normal.jpg","rocks_normal.jpg"];
var NNobjCompImgIndex =["utensilrope_normal.jpg","camp_normal.jpg","woodsground_normal.jpg","rocks_normal.jpg"];
var NNtexCount = 0;
var NNnumTextures = NNimgNames.length;



var BOOtextures = {};
var BOOimgNames = ["BooTexture.png","BooTexture.png","BooTexture.png","BooTexture.png","BooTexture.png","BooTexture.png"];
var BOOobjCompImgIndex =["BooTexture.png","BooTexture.png","BooTexture.png","BooTexture.png","BooTexture.png","BooTexture.png"];
var BOOtexCount = 0;
var BOOnumTextures = BOOimgNames.length;

var Shytextures = {};
var ShyimgNames = ["heyho_body_alb.png"];
var ShyobjCompImgIndex = ["heyho_body_alb.png"];
var ShytexCount = 0;
var ShynumTextures = ShyimgNames.length;


var Cytextures = {};
var CyimgNames = ["red.jpg","red.jpg","red.jpg","red.jpg","red.jpg","red.jpg","red.jpg","red.jpg","red.jpg","red.jpg","red.jpg","red.jpg","red.jpg","red.jpg","red.jpg","red.jpg"];
var CyobjCompImgIndex = ["red.jpg","red.jpg","red.jpg","red.jpg","red.jpg","red.jpg","red.jpg","red.jpg","red.jpg","red.jpg","red.jpg","red.jpg","red.jpg","red.jpg","red.jpg","red.jpg"];
var CytexCount = 0;
var CynumTextures = CyimgNames.length;


var CNNtextures = {};
var CNNimgNames = ["crystal_normal.jpg","crystal_normal.jpg","crystal_normal.jpg","crystal_normal.jpg","crystal_normal.jpg","crystal_normal.jpg","crystal_normal.jpg","crystal_normal.jpg","crystal_normal.jpg","crystal_normal.jpg","crystal_normal.jpg","crystal_normal.jpg","crystal_normal.jpg","crystal_normal.jpg","crystal_normal.jpg","crystal_normal.jpg","crystal_normal.jpg"];
var CNNobjCompImgIndex =["crystal_normal.jpg","crystal_normal.jpg","crystal_normal.jpg","crystal_normal.jpg","crystal_normal.jpg","crystal_normal.jpg","crystal_normal.jpg","crystal_normal.jpg","crystal_normal.jpg","crystal_normal.jpg","crystal_normal.jpg","crystal_normal.jpg","crystal_normal.jpg","crystal_normal.jpg","crystal_normal.jpg","crystal_normal.jpg","crystal_normal.jpg"];
var CNNtexCount = 0;
var CNNnumTextures = NNimgNames.length;

var moveDistance = 0;
var rotateAngle = [];
var downY = [];

var cubeObj = [];
var quadObj;
var cubeMapTex;


var RcubeMapTex;
var objScale = 0.8;
var Rcube = [];
var RquadObj;
var xpos = [],zpos = [],ypos = []
var rAngle = [];


var offScreenWidth = 256, offScreenHeight = 256;
var fbo;

var lightX = 5, lightY = 1, lightZ = 7;
var myfbo;
var sphereObj;
var sphereNum = 0;
var newViewDir;

async function main(){
    canvas = document.getElementById('webgl');
    gl = canvas.getContext('webgl2');
    if(!gl){
        console.log('Failed to get the rendering context for WebGL');
        return ;
    }
                                      

     var quad = new Float32Array(
      [
        -1, -1, 1,
         1, -1, 1,
        -1,  1, 1,
        -1,  1, 1,
         1, -1, 1,
         1,  1, 1
      ]); //just a quad
      //=========================Cube map===========================
     programEnvCube = compileShader(gl, VSHADER_SOURCE_ENVCUBE, FSHADER_SOURCE_ENVCUBE);
    programEnvCube.a_Position = gl.getAttribLocation(programEnvCube, 'a_Position');
    programEnvCube.u_envCubeMap = gl.getUniformLocation(programEnvCube, 'u_envCubeMap'); 
    programEnvCube.u_viewDirectionProjectionInverse = 
               gl.getUniformLocation(programEnvCube, 'u_viewDirectionProjectionInverse'); 

    quadObj = initVertexBufferForLaterUse(gl, quad);
    
    //============================================================
    //====================Reflectiion==============================
      programReflect = compileShader(gl, VSHADER_REFLECT_SOURCE, FSHADER_REFLECT_SOURCE);
      programReflect.a_Position = gl.getAttribLocation(programReflect, 'a_Position'); 
      programReflect.a_Normal = gl.getAttribLocation(programReflect, 'a_Normal'); 
      programReflect.u_MvpMatrix = gl.getUniformLocation(programReflect, 'u_MvpMatrix'); 
      programReflect.u_modelMatrix = gl.getUniformLocation(programReflect, 'u_modelMatrix'); 
      programReflect.u_normalMatrix = gl.getUniformLocation(programReflect, 'u_normalMatrix');
      programReflect.u_ViewPosition = gl.getUniformLocation(programReflect, 'u_ViewPosition');
      programReflect.u_envCubeMap = gl.getUniformLocation(programReflect, 'u_envCubeMap');

      for( var j=0; j<50 ; j++ )
        rotateAngle[j] = 0;
      response = await fetch('snow.obj');
      text = await response.text();
      obj = parseOBJ(text);

    for( let i=0; i < obj.geometries.length; i ++ ){
      let o = initVertexBufferForLaterUse(gl, 
                                          obj.geometries[i].data.position,
                                          obj.geometries[i].data.normal, 
                                          obj.geometries[i].data.texcoord);

        reflectCube.push(o);
    }
    reflectNum = reflectCube.length;
    for( let j = 0 ; j < 4 ; j ++ ){
      for( let i=0; i < obj.geometries.length; i ++ ){
        let o = initVertexBufferForLaterUse(gl, 
                                            obj.geometries[i].data.position,
                                            obj.geometries[i].data.normal, 
                                            obj.geometries[i].data.texcoord);

          reflectCube.push(o);
      }

    }
    for( var i=0; i < 50 ; i++ ){
      xpos.push(getRandom( -80,80 ));
      zpos.push(getRandom( -80,80 ));
      ypos.push(getRandom( 50,100 ));
      downY.push( getRandom( 1,3 ) );
      rAngle.push( getRandom( 0.25,0.6 ) );
    }
    
    //===============================================================
    //==========================dynamic===============================
    programTextureOnCube = compileShader(gl, VSHADER_SOURCE_TEXTURE_ON_CUBE, FSHADER_SOURCE_TEXTURE_ON_CUBE);
    programTextureOnCube.a_Position = gl.getAttribLocation(programTextureOnCube, 'a_Position'); 
    programTextureOnCube.a_Normal = gl.getAttribLocation(programTextureOnCube, 'a_Normal'); 
    programTextureOnCube.u_MvpMatrix = gl.getUniformLocation(programTextureOnCube, 'u_MvpMatrix'); 
    programTextureOnCube.u_modelMatrix = gl.getUniformLocation(programTextureOnCube, 'u_modelMatrix'); 
    programTextureOnCube.u_normalMatrix = gl.getUniformLocation(programTextureOnCube, 'u_normalMatrix');
    programTextureOnCube.u_ViewPosition = gl.getUniformLocation(programTextureOnCube, 'u_ViewPosition');
    programTextureOnCube.u_envCubeMap = gl.getUniformLocation(programTextureOnCube, 'u_envCubeMap'); 
    programTextureOnCube.u_Color = gl.getUniformLocation(programTextureOnCube, 'u_Color'); 
    
    myfbo = initFrameBufferForCubemapRendering(gl);
    //===================================================
    //==================Object===============================
    program = compileShader(gl, VSHADER_SOURCE, FSHADER_SOURCE);

    gl.useProgram(program);

    program.a_Position = gl.getAttribLocation(program, 'a_Position');
    program.a_TexCoord = gl.getAttribLocation(program, 'a_TexCoord'); 
    program.a_Normal = gl.getAttribLocation(program, 'a_Normal'); 
    program.a_Tagent = gl.getAttribLocation(program, 'a_Tagent'); 
    program.a_Bitagent = gl.getAttribLocation(program, 'a_Bitagent'); 
    program.a_crossTexCoord = gl.getAttribLocation(program, 'a_crossTexCoord');
    
    program.u_MvpMatrix = gl.getUniformLocation(program, 'u_MvpMatrix'); 
    program.u_modelMatrix = gl.getUniformLocation(program, 'u_modelMatrix'); 
    program.u_normalMatrix = gl.getUniformLocation(program, 'u_normalMatrix');
    program.u_LightPosition = gl.getUniformLocation(program, 'u_LightPosition');
    program.u_ViewPosition = gl.getUniformLocation(program, 'u_ViewPosition');
    program.u_Ka = gl.getUniformLocation(program, 'u_Ka'); 
    program.u_Kd = gl.getUniformLocation(program, 'u_Kd');
    program.u_Ks = gl.getUniformLocation(program, 'u_Ks');
    program.u_shininess = gl.getUniformLocation(program, 'u_shininess');
    program.u_Sampler = gl.getUniformLocation(program, "u_Sampler");
    program.u_Sampler0 = gl.getUniformLocation(program, "u_Sampler0");
    program.u_Color = gl.getUniformLocation(program, 'u_Color'); 
    program.isTexture = gl.getUniformLocation(program, 'isTexture'); 
    program.isBump = gl.getUniformLocation(program, 'isBump'); 

   
      fbo = initFrameBuffer(gl);

    /////3D model airplane
    airplane = await loadOBJtoCreateVBO('airplane.obj');
    

    for( let i=0; i < PimgNames.length; i ++ ){
      let image = new Image();
      image.onload = function(){initTexture(gl, image, PimgNames[i], Ptextures,PtexCount,PnumTextures);};
      image.src = PimgNames[i];
    }

    /////3D model camero
    camero = await loadOBJtoCreateVBO('camero.obj');
    for( let i=0; i < CimgNames.length; i ++ ){
      let image = new Image();
      image.onload = function(){initTexture(gl, image, CimgNames[i] , Ctextures ,CtexCount , CnumTextures);};
      image.src = CimgNames[i];
    }


    /////3D model cube
    cube = await loadOBJtoCreateVBO('cube.obj');

    for( let i=0; i < GimgNames.length; i ++ ){
      let image = new Image();
      image.onload = function(){initTexture(gl, image, GimgNames[i] , Gtextures ,GtexCount , GnumTextures);};
      image.src = GimgNames[i];
    }
    //======================camp OBJ=========================================
    response = await fetch('CampfireOBJ.obj');
    text = await response.text();
    obj = parseOBJ(text);

    for( let i=0; i < obj.geometries.length; i ++ ){
      let tagentSpace = calculateTangentSpace(obj.geometries[i].data.position, 
                                            obj.geometries[i].data.texcoord);
      let o = BBinitVertexBufferForLaterUse(gl, 
                                        obj.geometries[i].data.position,
                                        obj.geometries[i].data.normal, 
                                        obj.geometries[i].data.texcoord,
                                        tagentSpace.tagents,
                                        tagentSpace.bitagents,
                                        tagentSpace.crossTexCoords);
      camp.push(o);
    }
    for( let i=0; i < CAimgNames.length; i ++ ){
      let image = new Image();
      image.onload = function(){initTexture(gl, image, CAimgNames[i] , CAtextures ,CAtexCount , CAnumTextures);};
      image.src = CAimgNames[i];
    }
    for( let i=0; i < NNimgNames.length; i ++ ){
      let image = new Image();
      image.onload = function(){initTexture(gl, image, NNimgNames[i] , NNtextures ,NNtexCount , NNnumTextures);};
      image.src = NNimgNames[i];
    }
//==============================================================
    //======================crystal OBJ=========================================
    response = await fetch('crystal.obj');
    text = await response.text();
    obj = parseOBJ(text);

    for( let i=0; i < obj.geometries.length; i ++ ){
      let tagentSpace = calculateTangentSpace(obj.geometries[i].data.position, 
                                            obj.geometries[i].data.texcoord);
      let o = BBinitVertexBufferForLaterUse(gl, 
                                        obj.geometries[i].data.position,
                                        obj.geometries[i].data.normal, 
                                        obj.geometries[i].data.texcoord,
                                        tagentSpace.tagents,
                                        tagentSpace.bitagents,
                                        tagentSpace.crossTexCoords);
      crystal.push(o);
    }
    for( let i=0; i < CyimgNames.length; i ++ ){
      let image = new Image();
      image.onload = function(){initTexture(gl, image, CyimgNames[i] , Cytextures ,CytexCount , CynumTextures);};
      image.src = CyimgNames[i];
    }
    for( let i=0; i < CNNimgNames.length; i ++ ){
      let image = new Image();
      image.onload = function(){initTexture(gl, image, CNNimgNames[i] ,CNNtextures ,CNNtexCount , CNNnumTextures);};
      image.src = CNNimgNames[i];
    }
//==============================================================

    //boo
    boo = await loadOBJtoCreateVBO('boo.obj');
    for( let i=0; i < BOOimgNames.length; i ++ ){
      let image = new Image();
      image.onload = function(){initTexture(gl, image, BOOimgNames[i] , BOOtextures ,BOOtexCount , BOOnumTextures);};
      image.src = BOOimgNames[i];
    }

    //shyGuy
    shy = await loadOBJtoCreateVBO('ShyGuy.obj');
    for( let i=0; i < ShyimgNames.length; i ++ ){
      let image = new Image();
      image.onload = function(){initTexture(gl, image, ShyimgNames[i] , Shytextures ,ShytexCount , ShynumTextures);};
      image.src = ShyimgNames[i];
    }

    //snow
    snowflake = await loadOBJtoCreateVBO('snow.obj');
    
    //=============================Sphere============================
    sphereObj = await loadOBJtoCreateVBO('sphere.obj');
    sphereNum = sphereObj.length;
    //===============================================================


    gl.useProgram(programEnvCube);
    cubeMapTex = initCubeTexture("pos-x.jpg", "neg-x.jpg", "pos-y.jpg", "neg-y.jpg", 
                                      "pos-z.jpg", "neg-z.jpg", 2048, 2048);
   
    gl.enable(gl.DEPTH_TEST);
    
    draw();//draw it once before mouse move


    canvas.onmousedown = function(ev){mouseDown(ev)};
    canvas.onmousemove = function(ev){mouseMove(ev)};
    canvas.onmouseup = function(ev){mouseUp(ev)};
    document.onkeydown = function(ev){keydown(ev)};
    var tick = function() {
      
      for( var j=0; j<50; j++ ){
        rotateAngle[j] += rAngle[j];
        downY[j] = downY[j]+0.8;
      }
      draw();
      requestAnimationFrame(tick);
    }
    tick();

}


function draw(){
  // gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.viewport(0, 0, offScreenWidth, offScreenHeight);
  
  drawOffScreen();
  //null -> swtich the radering destination back to the canvas
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, canvas.width, canvas.height);
  drawOnScreen();
  renderCubeMap(0, 0, 0);
}

/////Call drawOneObject() here to draw all object one by one 
////   (setup the model matrix and color to draw)
//Ask a shader draw mario
function drawOffScreen(){
  gl.clearColor(1.0, 0.8, 0.2, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  AllObjDraw(0.0);
}

function drawOnScreen(){
    gl.clearColor(0,0,0,1);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    AllObjDraw(1.0);

}

var mdlMatrix1 = new Matrix4();
var matStack = [];
function pushMatrix(){
    matStack.push(new Matrix4( mdlMatrix1 ));
}
function popMatrix(){
     mdlMatrix1 = matStack.pop();
}

//產生min到max之間的亂數
function getRandom(min,max){
    return Math.floor(Math.random()*(max-min+1))+min;
};


function AllObjDraw( isOnScreen ){
    
    gl.clearColor(0.0,0.0,0.0,1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.useProgram(program);
    
    let mdlMatrix2 = new Matrix4(); //model matrix of objects
    let mdlMatrix4 = new Matrix4(); 

    let rotateMatrix = new Matrix4();
    
    rotateMatrix.setIdentity();
    if( isOnScreen && isChange){
      rotateMatrix.rotate(angleY, 1, 0, 0);//for mouse rotation
      rotateMatrix.rotate(angleX, 0, 1, 0);//for mouse rotation
    }

    var viewDir;
    if( isChange )
      viewDir = new Vector3([cameraDirX, cameraDirY, cameraDirZ]);
    else
      viewDir = new Vector3([CcameraDirX, CcameraDirY, CcameraDirZ]);
    newViewDir = rotateMatrix.multiplyVector3(viewDir);

    var vpFromCamera = new Matrix4();
   vpFromCamera.setPerspective(60, 1, 1, 100);
    var viewMatrixRotationOnly = new Matrix4();
  if( isOnScreen ){
    if( isChange ){
      viewMatrixRotationOnly.lookAt(cameraX, cameraY, cameraZ, 
                                    cameraX + newViewDir.elements[0], 
                                    cameraY + newViewDir.elements[1], 
                                    cameraZ + newViewDir.elements[2], 
                                    0, 1, 0);
    }
    else{
      viewMatrixRotationOnly.lookAt(cX, cY, cZ, 
                                      cX + newViewDir.elements[0], 
                                      cY + newViewDir.elements[1], 
                                      cZ + newViewDir.elements[2], 
                                      0, 1, 0);
    }
 }
 else{
      viewMatrixRotationOnly.lookAt(10,3,9  ,
                                    0.0 + newViewDir.elements[0], 
                                    2.5 + newViewDir.elements[1], 
                                    9 + newViewDir.elements[2], 
                                    0, 1, 0);
  }
  //-----------------------------------------                              
  viewMatrixRotationOnly.elements[12] = 0; //ignore translation
  viewMatrixRotationOnly.elements[13] = 0;
  viewMatrixRotationOnly.elements[14] = 0;
  //no translation of camera--------------------
  vpFromCamera.multiply(viewMatrixRotationOnly);
  var vpFromCameraInverse = vpFromCamera.invert();
   //==================dynamic sphere draw===========

    let SmdlMatrix = new Matrix4();
    let SmvpMatrix = new Matrix4();
    SmdlMatrix.setScale(0.2, 0.2, 0.2);
    SmdlMatrix.translate( 0.0, 0.0, 5.0);
    SmvpMatrix.setPerspective(60, 1, 1, 100);
    if( isOnScreen ){
      if( isChange ){
          
        SmvpMatrix.lookAt(cameraX, cameraY, cameraZ, 
                                          cameraX + newViewDir.elements[0], 
                                          cameraY + newViewDir.elements[1], 
                                          cameraZ + newViewDir.elements[2], 
                                          0, 1, 0);
      }
      else{
          SmvpMatrix.lookAt( cX, cY, cZ, 
                                          cX + newViewDir.elements[0], 
                                          cY + newViewDir.elements[1], 
                                          cZ + newViewDir.elements[2], 
                                          0, 1, 0);
      }
    }
    else{
      SmvpMatrix.lookAt(10,3,9 ,
                                      0.0 + newViewDir.elements[0], 
                                      2.5 + newViewDir.elements[1], 
                                      9 + newViewDir.elements[2], 
                                      0, 1, 0);
    }
    gl.useProgram(programTextureOnCube);
    drawObjectWithDynamicReflection(sphereObj, SmdlMatrix,SmvpMatrix, 0.95, 0.85, 0.4);
   
//===========================================================================


  FuncDrawArray( SmvpMatrix );

  //cube of screen
  if( isOnScreen ){

    gl.useProgram(program);
    mdlMatrix4.setTranslate( 1.0,0.0,5.0 );
    mdlMatrix4.scale( 1.0,1.0,0.2 );
    //gl.uniform3f(program.texColor, 1.0, 0.4, 0.4);
    drawOneObject( mdlMatrix4,SmvpMatrix);
    for( let i=0; i < cube.length; i ++ ){
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, fbo.texture);
      gl.uniform1i(program.u_Sampler, 1);
      gl.uniform1f(program.isTexture, 1);

      initAttributeVariable(gl, program.a_Position, cube[i].vertexBuffer);
      initAttributeVariable(gl, program.a_TexCoord, cube[i].texCoordBuffer);
      initAttributeVariable(gl, program.a_Normal, cube[i].normalBuffer);
      gl.drawArrays(gl.TRIANGLES, 0, cube[i].numVertices);
    }
  }
//cube off screen===============================================
  //quad
  gl.useProgram(programEnvCube);
  gl.depthFunc(gl.LEQUAL);
  gl.uniformMatrix4fv(programEnvCube.u_viewDirectionProjectionInverse, 
                      false, vpFromCameraInverse.elements);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMapTex);
  gl.uniform1i(programEnvCube.u_envCubeMap, 0);
  initAttributeVariable(gl, programEnvCube.a_Position, quadObj.vertexBuffer);
  gl.drawArrays(gl.TRIANGLES, 0, quadObj.numVertices);


}

function FuncDrawArray( mpMatrix ){
  gl.useProgram(program);
  let mdlMatrix = new Matrix4(); //model matrix of objects
     mdlMatrix.setIdentity();
    
    gl.uniform1f(program.isBump, 0.0);

    //airplane
    //TODO-2: set mdlMatrix for airplane
    mdlMatrix1.setIdentity();
    pushMatrix();
    mdlMatrix1.translate( 0.0,2.0,0.0 );
    mdlMatrix1.scale( 0.05,0.05,0.05 );
    drawOneObject( mdlMatrix1, mpMatrix);
    for( let i=0; i < airplane.length; i ++ ){
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, Ptextures[PobjCompImgIndex[i]]);
      gl.uniform1i(program.u_Sampler, 1);
       gl.uniform1f(program.isTexture, 1.0);

      initAttributeVariable(gl, program.a_Position, airplane[i].vertexBuffer);
      initAttributeVariable(gl, program.a_TexCoord, airplane[i].texCoordBuffer);
      initAttributeVariable(gl, program.a_Normal, airplane[i].normalBuffer);
      gl.drawArrays(gl.TRIANGLES, 0, airplane[i].numVertices);
    }
    popMatrix();
    //camero
    //TODO-3: set mdlMatrix for camero (include rotation and movement)
    pushMatrix();
    mdlMatrix1.translate( 10,-3.0,4.0 );
    mdlMatrix1.scale( 2.0,2.0,2.0 );
    drawOneObject( mdlMatrix1,mpMatrix);
    for( let i=0; i < camero.length; i ++ ){
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, Ctextures[CobjCompImgIndex[0]]);
      gl.uniform1i(program.u_Sampler, 1);
      gl.uniform1f(program.isTexture, 1.0);

      initAttributeVariable(gl, program.a_Position, camero[i].vertexBuffer);
      initAttributeVariable(gl, program.a_TexCoord, camero[i].texCoordBuffer);
      initAttributeVariable(gl, program.a_Normal, camero[i].normalBuffer);
      gl.drawArrays(gl.TRIANGLES, 0, camero[i].numVertices);
    }
    popMatrix();
    pushMatrix();
    //---------------------------------------camp----------------------------

    mdlMatrix1.translate( -10.0,-2.0,-10.0 );
    mdlMatrix1.rotate( 180,0,1,0 );
   mdlMatrix1.scale( 0.2,0.2,0.2 );
    drawOneObject( mdlMatrix1,mpMatrix);
    for( let i=0; i < camp.length; i ++ ){
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, CAtextures[CAobjCompImgIndex[i]]);
       gl.uniform1i(program.u_Sampler, 0);
        gl.uniform1f(program.isBump, 1.0);

      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, NNtextures[NNobjCompImgIndex[i]]);
      gl.uniform1i(program.u_Sampler0, 1);
      gl.uniform1f(program.isTexture, 1.0);
      
      initAttributeVariable(gl, program.a_Position, camp[i].vertexBuffer);
      initAttributeVariable(gl, program.a_TexCoord, camp[i].texCoordBuffer);
      initAttributeVariable(gl, program.a_Normal, camp[i].normalBuffer);
       //gl.drawArrays(gl.TRIANGLES, 0, camp[i].numVertices);
      initAttributeVariable(gl, program.a_Tagent, camp[i].tagentsBuffer);
      // console.log( camp[i].tagentsBuffer);
      initAttributeVariable(gl, program.a_Bitagent, camp[i].bitagentsBuffer);
      initAttributeVariable(gl, program.a_crossTexCoord, camp[i].crossTexCoordsBuffer);
      //console.log( camp[i].crossTexCoordsBuffer);
      gl.drawArrays(gl.TRIANGLES, 0, camp[i].numVertices);
    }
    //-----------------------------------------------------------
    popMatrix();
    pushMatrix();
     //---------------------------------------crystal----------------------------

    mdlMatrix1.translate( -3.0,-2.0,7.0 );
    //mdlMatrix1.rotate( 180,0,1,0 );
   mdlMatrix1.scale( 0.05,0.05,0.05 );
    drawOneObject( mdlMatrix1,mpMatrix);
    for( let i=0; i < crystal.length; i ++ ){
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, Cytextures[CyobjCompImgIndex[i]]);
       gl.uniform1i(program.u_Sampler, 0);
        gl.uniform1f(program.isBump, 1.0);

      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, CNNtextures[CNNobjCompImgIndex[i]]);
      gl.uniform1i(program.u_Sampler0, 1);
      gl.uniform1f(program.isTexture, 1.0);
      
      initAttributeVariable(gl, program.a_Position, crystal[i].vertexBuffer);
      initAttributeVariable(gl, program.a_TexCoord, crystal[i].texCoordBuffer);
      initAttributeVariable(gl, program.a_Normal, crystal[i].normalBuffer);
       //gl.drawArrays(gl.TRIANGLES, 0, camp[i].numVertices);
       gl.drawArrays(gl.TRIANGLES, 0, crystal[i].numVertices);
      initAttributeVariable(gl, program.a_Tagent, crystal[i].tagentsBuffer);
      // console.log( camp[i].tagentsBuffer);
      initAttributeVariable(gl, program.a_Bitagent, crystal[i].bitagentsBuffer);
      initAttributeVariable(gl, program.a_crossTexCoord, crystal[i].crossTexCoordsBuffer);
      //console.log( camp[i].crossTexCoordsBuffer);
    }
    //-----------------------------------------------------------
    popMatrix();
    pushMatrix();
    

    //boo
    //mdlMatrix1.translate( -5.0,-3.0,10.0 );
    gl.uniform1f(program.isBump, 0.0);
    mdlMatrix1.translate( booX ,-0.2,booZ-1.5 );
    mdlMatrix1.rotate( angleX,0,1,0 );
    mdlMatrix1.rotate( -angleY,1,0,0 );
    mdlMatrix1.scale( 2.0,2.0,2.0 );
    drawOneObject( mdlMatrix1,mpMatrix);
    for( let i=0; i < boo.length; i ++ ){
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, BOOtextures[BOOobjCompImgIndex[i]]);
      gl.uniform1i(program.u_Sampler, 1);
      gl.uniform1f(program.isTexture, 1.0);

      initAttributeVariable(gl, program.a_Position, boo[i].vertexBuffer);
      initAttributeVariable(gl, program.a_TexCoord, boo[i].texCoordBuffer);
      initAttributeVariable(gl, program.a_Normal, boo[i].normalBuffer);
      gl.drawArrays(gl.TRIANGLES, 0, boo[i].numVertices);
    }

    popMatrix();
    pushMatrix();
    //shyguy
    mdlMatrix1.translate( -8.0,-3.0,8.0 );
    mdlMatrix1.rotate( 130,0,1,0 );
    mdlMatrix1.scale( 0.3,0.3,0.3 );
    drawOneObject( mdlMatrix1,mpMatrix);
    for( let i=0; i < shy.length; i ++ ){
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, Shytextures[ShyobjCompImgIndex[i]]);
      gl.uniform1i(program.u_Sampler, 1);
      gl.uniform1f(program.isTexture, 1.0);

      initAttributeVariable(gl, program.a_Position, shy[i].vertexBuffer);
      initAttributeVariable(gl, program.a_TexCoord, shy[i].texCoordBuffer);
      initAttributeVariable(gl, program.a_Normal, shy[i].normalBuffer);
      gl.drawArrays(gl.TRIANGLES, 0, shy[i].numVertices);
    }
    
    //=================================snowflake======================================
    for( var j=0; j < 50 ; j++ ){
     
      popMatrix();
    pushMatrix();
    mdlMatrix1.translate( xpos[j]+1,ypos[j]-downY[j]*0.2, zpos[j]  );
      mdlMatrix1.rotate(rotateAngle[j], 1, 1, 1); //make the cube rotate
        if( ypos[j]-downY[j]*0.2 < -30 ){
        downY[j] = getRandom( 1,3 );
        xpos[j] =getRandom( -80,80 );
        zpos[j] =getRandom( -80,80 );
        ypos[j] = getRandom( 50,100 );
        rAngle[j] = getRandom( 0.25,0.6 );
      }
      mdlMatrix1.scale( 0.1, 0.1, 0.1);
      drawOneObject( mdlMatrix1,mpMatrix);
      for( let i=0; i < snowflake.length; i ++ ){
        gl.uniform1f(program.isTexture, 0.0);
        gl.uniform3f(program.u_Color, 1.0, 1.0, 1.0);
        initAttributeVariable(gl, program.a_Position, snowflake[i].vertexBuffer);
        initAttributeVariable(gl, program.a_Normal, snowflake[i].normalBuffer);
        gl.drawArrays(gl.TRIANGLES, 0, snowflake[i].numVertices);
      }
    }
     popMatrix();
    pushMatrix();
    
  //====================================Draw the reflective cube==================
  gl.useProgram(programReflect);
  gl.depthFunc(gl.LESS);
  //model Matrix (part of the mvp matrix)
 
  
  for( var j=0; j < 50 ; j++ ){
  var RmodelMatrix = new Matrix4();
  RmodelMatrix.setIdentity();
  RmodelMatrix.translate( xpos[j],ypos[j]-downY[j]*0.4, zpos[j]+10);
  if( ypos[j]-downY[j]*0.2 < -30 ){
    downY[j] = getRandom( 1,3 );
    xpos[j] =getRandom( -80,80 );
     zpos[j] =getRandom( -80,80 );
     ypos[j] = getRandom( 50,100 );
     rAngle[j] = getRandom( 0.25,0.6 );
  }
  RmodelMatrix.rotate(rotateAngle[j], 1, 1, 1); //make the cube rotate
  
  RmodelMatrix.scale( 0.2, 0.2, 0.2);
  //mvp: projection * vew * model matrix  
  var RmvpMatrix = new Matrix4();
  RmvpMatrix.setIdentity();
  RmvpMatrix.set(mpMatrix);
  RmvpMatrix.multiply(RmodelMatrix);

  //normal matrix
  var RnormalMatrix = new Matrix4();
  RnormalMatrix.setInverseOf(RmodelMatrix);
  RnormalMatrix.transpose();

  gl.uniform3f(programReflect.u_ViewPosition, 0, 0, 0);
  gl.uniform1i(programReflect.u_envCubeMap, 0);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMapTex);

  gl.uniformMatrix4fv(programReflect.u_MvpMatrix, false, RmvpMatrix.elements);
  gl.uniformMatrix4fv(programReflect.u_modelMatrix, false, RmodelMatrix.elements);
  gl.uniformMatrix4fv(programReflect.u_normalMatrix, false, RnormalMatrix.elements);
  //reflectNum = reflectCube.length;
    for( let i=0; i < reflectNum ; i ++ ){
      initAttributeVariable(gl, program.a_Position, reflectCube[i].vertexBuffer);
      initAttributeVariable(gl, program.a_Normal, reflectCube[i].normalBuffer);
      gl.drawArrays(gl.TRIANGLES, 0, reflectCube[i].numVertices);
    }
  }
  //=====================================================================================

}
function drawObjectWithDynamicReflection(obj, modelMatrix, mpMatrix, colorR, colorG, colorB){

  let mvpMatrix = new Matrix4();
  let normalMatrix = new Matrix4();
  
  mvpMatrix.set(mpMatrix);

  //normal matrix
  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();
  if( isChange )
    gl.uniform3f(programTextureOnCube.u_ViewPosition, cameraX, cameraY, cameraZ);
  else
    gl.uniform3f(programTextureOnCube.u_ViewPosition, cX, cY, cZ);
  gl.uniform3f(programTextureOnCube.u_Color, colorR, colorG, colorB);

  gl.uniformMatrix4fv(programTextureOnCube.u_MvpMatrix, false, mvpMatrix.elements);
  gl.uniformMatrix4fv(programTextureOnCube.u_modelMatrix, false, modelMatrix.elements);
  gl.uniformMatrix4fv(programTextureOnCube.u_normalMatrix, false, normalMatrix.elements);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, myfbo.texture);
  gl.uniform1i(programTextureOnCube.u_envCubeMap, 0);
  
  for( let i=0; i < sphereNum; i ++ ){
    initAttributeVariable(gl, programTextureOnCube.a_Position, obj[i].vertexBuffer);
    initAttributeVariable(gl, programTextureOnCube.a_Normal, obj[i].normalBuffer);
    gl.drawArrays(gl.TRIANGLES, 0, obj[i].numVertices);
  }
}

//obj: the object components
//mdlMatrix: the model matrix without mouse rotation
//colorR, G, B: object color
function drawOneObject(mdlMatrix, mpMatrix ){
    //model Matrix (part of the mvp matrix)
 
    mvpMatrix = new Matrix4();
    modelMatrix = new Matrix4();
    normalMatrix = new Matrix4();
    modelMatrix.setIdentity();
    modelMatrix.translate( 0.0,0.0,10.0);
    modelMatrix.scale( 2.0,2.0,2.0);
    modelMatrix.multiply(mdlMatrix);
    //mvp: projection * view * model matrix  
    
      mvpMatrix.set( mpMatrix );
    
    mvpMatrix.multiply(modelMatrix);

    //normal matrix
    normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();
    
    //gl.uniform3f(program.u_LightPosition, 2, 4, 18);
      gl.uniform3f(program.u_LightPosition, 4, 10, 10);
    gl.uniform3f(program.u_ViewPosition, 0 , 0 , 7);

    
    gl.uniform1f(program.u_Ka, 0.4);
    gl.uniform1f(program.u_Kd, 0.2);
    gl.uniform1f(program.u_Ks, 1.0);
    gl.uniform1f(program.u_shininess, 10.0);


    gl.uniformMatrix4fv(program.u_MvpMatrix, false, mvpMatrix.elements);
    gl.uniformMatrix4fv(program.u_modelMatrix, false, modelMatrix.elements);
    gl.uniformMatrix4fv(program.u_normalMatrix, false, normalMatrix.elements);

}


async function loadOBJtoCreateVBO( objFile ){
  let objComponents = [];
  response = await fetch(objFile);
  text = await response.text();
  obj = parseOBJ(text);
  for( let i=0; i < obj.geometries.length; i ++ ){
    let o = initVertexBufferForLaterUse(gl, 
                                        obj.geometries[i].data.position,
                                        obj.geometries[i].data.normal, 
                                        obj.geometries[i].data.texcoord);
    objComponents.push(o);
  }
  return objComponents;
}

function parseOBJ(text) {
  // because indices are base 1 let's just fill in the 0th data
  const objPositions = [[0, 0, 0]];
  const objTexcoords = [[0, 0]];
  const objNormals = [[0, 0, 0]];

  // same order as `f` indices
  const objVertexData = [
    objPositions,
    objTexcoords,
    objNormals,
  ];

  // same order as `f` indices
  let webglVertexData = [
    [],   // positions
    [],   // texcoords
    [],   // normals
  ];

  const materialLibs = [];
  const geometries = [];
  let geometry;
  let groups = ['default'];
  let material = 'default';
  let object = 'default';

  const noop = () => {};

  function newGeometry() {
    // If there is an existing geometry and it's
    // not empty then start a new one.
    if (geometry && geometry.data.position.length) {
      geometry = undefined;
    }
  }

  function setGeometry() {
    if (!geometry) {
      const position = [];
      const texcoord = [];
      const normal = [];
      webglVertexData = [
        position,
        texcoord,
        normal,
      ];
      geometry = {
        object,
        groups,
        material,
        data: {
          position,
          texcoord,
          normal,
        },
      };
      geometries.push(geometry);
    }
  }

  function addVertex(vert) {
    const ptn = vert.split('/');
    ptn.forEach((objIndexStr, i) => {
      if (!objIndexStr) {
        return;
      }
      const objIndex = parseInt(objIndexStr);
      const index = objIndex + (objIndex >= 0 ? 0 : objVertexData[i].length);
      webglVertexData[i].push(...objVertexData[i][index]);
    });
  }

  const keywords = {
    v(parts) {
      objPositions.push(parts.map(parseFloat));
    },
    vn(parts) {
      objNormals.push(parts.map(parseFloat));
    },
    vt(parts) {
      // should check for missing v and extra w?
      objTexcoords.push(parts.map(parseFloat));
    },
    f(parts) {
      setGeometry();
      const numTriangles = parts.length - 2;
      for (let tri = 0; tri < numTriangles; ++tri) {
        addVertex(parts[0]);
        addVertex(parts[tri + 1]);
        addVertex(parts[tri + 2]);
      }
    },
    s: noop,    // smoothing group
    mtllib(parts, unparsedArgs) {
      // the spec says there can be multiple filenames here
      // but many exist with spaces in a single filename
      materialLibs.push(unparsedArgs);
    },
    usemtl(parts, unparsedArgs) {
      material = unparsedArgs;
      newGeometry();
    },
    g(parts) {
      groups = parts;
      newGeometry();
    },
    o(parts, unparsedArgs) {
      object = unparsedArgs;
      newGeometry();
    },
  };

  const keywordRE = /(\w*)(?: )*(.*)/;
  const lines = text.split('\n');
  for (let lineNo = 0; lineNo < lines.length; ++lineNo) {
    const line = lines[lineNo].trim();
    if (line === '' || line.startsWith('#')) {
      continue;
    }
    const m = keywordRE.exec(line);
    if (!m) {
      continue;
    }
    const [, keyword, unparsedArgs] = m;
    const parts = line.split(/\s+/).slice(1);
    const handler = keywords[keyword];
    if (!handler) {
      console.warn('unhandled keyword:', keyword);  // eslint-disable-line no-console
      continue;
    }
    handler(parts, unparsedArgs);
  }

  // remove any arrays that have no entries.
  for (const geometry of geometries) {
    geometry.data = Object.fromEntries(
        Object.entries(geometry.data).filter(([, array]) => array.length > 0));
  }

  return {
    geometries,
    materialLibs,
  };
}

function mouseDown(ev){ 
    var x = ev.clientX;
    var y = ev.clientY;
    var rect = ev.target.getBoundingClientRect();
    if( rect.left <= x && x < rect.right && rect.top <= y && y < rect.bottom){
        mouseLastX = x;
        mouseLastY = y;
        mouseDragging = true;
    }
}

function mouseUp(ev){ 
    mouseDragging = false;
}

function mouseMove(ev){ 
    var x = ev.clientX;
    var y = ev.clientY;
    if( mouseDragging ){
        var factor = 100/canvas.height; //100 determine the spped you rotate the object
        var dx = factor * (x - mouseLastX);
        var dy = factor * (y - mouseLastY);

        angleX += dx; //yes, x for y, y for x, this is right
        angleY += dy;
    }
    mouseLastX = x;
    mouseLastY = y;

    draw();
}

function initCubeTexture(posXName, negXName, posYName, negYName, 
                         posZName, negZName, imgWidth, imgHeight)
{
  var texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);

  const faceInfos = [
    {
      target: gl.TEXTURE_CUBE_MAP_POSITIVE_X,
      fName: posXName,
    },
    {
      target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
      fName: negXName,
    },
    {
      target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
      fName: posYName,
    },
    {
      target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
      fName: negYName,
    },
    {
      target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
      fName: posZName,
    },
    {
      target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
      fName: negZName,
    },
  ];
  faceInfos.forEach((faceInfo) => {
    const {target, fName} = faceInfo;
    // setup each face so it's immediately renderable
    gl.texImage2D(target, 0, gl.RGBA, imgWidth, imgHeight, 0, 
                  gl.RGBA, gl.UNSIGNED_BYTE, null);

    var image = new Image();
    image.onload = function(){
       gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
      gl.texImage2D(target, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
    };
    image.src = fName;
  });
  gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

  return texture;
}


function keydown(ev){ 
  //implment keydown event here
  let rotateMatrix = new Matrix4();
  rotateMatrix.setRotate(angleY, 1, 0, 0);//for mouse rotation
  rotateMatrix.rotate(angleX, 0, 1, 0);//for mouse rotation
  var viewDir;
  if( isChange )
    viewDir= new Vector3([cameraDirX, cameraDirY, cameraDirZ]);
  else
    viewDir= new Vector3([CcameraDirX, CcameraDirY, CcameraDirZ]);
  var newViewDir;

  if( isChange ){
    newViewDir = rotateMatrix.multiplyVector3(viewDir);
    if(ev.key == 'w'){ 
        cameraX += (newViewDir.elements[0] * 0.1);
         //cameraY += (newViewDir.elements[1] * 0.1);
        cameraZ += (newViewDir.elements[2] * 0.1);
        booX += (newViewDir.elements[0] * 0.05);
         //cameraY += (newViewDir.elements[1] * 0.1);
        booZ += (newViewDir.elements[2] * 0.05);
    }
    else if(ev.key == 's'){ 
      cameraX -= (newViewDir.elements[0] * 0.1);
      //cameraY -= (newViewDir.elements[1] * 0.1);
      cameraZ -= (newViewDir.elements[2] * 0.1);
      booX -= (newViewDir.elements[0] * 0.05);
      //cameraY -= (newViewDir.elements[1] * 0.1);
      booZ -= (newViewDir.elements[2] * 0.05);
    }
  }

  if(ev.key == 'a'){ 
    isChange = !isChange;
  }

  console.log(cameraX, cameraY, cameraZ)
  console.log(booX, booZ)
  draw();
}

function initTexture(gl, img, imgName , textures,texCount , numTextures){
  var tex = gl.createTexture();
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.bindTexture(gl.TEXTURE_2D, tex);

  
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

  // Upload the image into the texture.
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

  textures[imgName] = tex;

  texCount++;
  if( texCount == numTextures)draw();
}

function initFrameBuffer(gl){
  //create and set up a texture object as the color buffer
  var texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  //don't load any thing outside '

  //offScreenWidth &...height like canvas , null -> dont attach any image
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, offScreenWidth, offScreenHeight,
                  0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

  //create and setup a render buffer as the depth buffer

  var depthBuffer = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
  //gl.DEPTH_COMPONENT16 -> 16bits
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, 
                          offScreenWidth, offScreenHeight);

  //create and setup framebuffer: linke the color and depth buffer to it
  var frameBuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, 
                            gl.TEXTURE_2D, texture, 0);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, 
                              gl.RENDERBUFFER, depthBuffer);

  frameBuffer.texture = texture;
  return frameBuffer;
}


// dynamic reflect
function renderCubeMap(camX, camY, camZ )
{
  //camera 6 direction to render 6 cubemap faces
  myfbo = initFrameBufferForCubemapRendering(gl);
  var ENV_CUBE_LOOK_DIR = [
      [1.0, 0.0, 0.0],
      [-1.0, 0.0, 0.0],
      [0.0, 1.0, 0.0],
      [0.0, -1.0, 0.0],
      [0.0, 0.0, 1.0],
      [0.0, 0.0, -1.0]
  ];

  //camera 6 look up vector to render 6 cubemap faces
  var ENV_CUBE_LOOK_UP = [
      [0.0, -1.0, 0.0],
      [0.0, -1.0, 0.0],
      [0.0, 0.0, 1.0],
      [0.0, 0.0, -1.0],
      [0.0, -1.0, 0.0],
      [0.0, -1.0, 0.0]
  ];

  gl.useProgram(program);
  gl.bindFramebuffer(gl.FRAMEBUFFER, myfbo);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.viewport(0, 0, offScreenWidth, offScreenHeight);
  gl.clearColor(0.4, 0.4, 0.4,1);
  for (var side = 0; side < 6;side++){
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, 
                            gl.TEXTURE_CUBE_MAP_POSITIVE_X+side, myfbo.texture, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let vpMatrix = new Matrix4();
    vpMatrix.setPerspective(90, 1, 1, 100);
    vpMatrix.lookAt(camX, camY, camZ,   
                    camX + ENV_CUBE_LOOK_DIR[side][0], 
                    camY + ENV_CUBE_LOOK_DIR[side][1],
                    camZ + ENV_CUBE_LOOK_DIR[side][2], 
                    ENV_CUBE_LOOK_UP[side][0],
                    ENV_CUBE_LOOK_UP[side][1],
                    ENV_CUBE_LOOK_UP[side][2]);
    FuncDrawArray( vpMatrix );
    //***************************************************************************************************************
    //quad
    var vpFromCameraInverse = vpMatrix.invert();
  gl.useProgram(programEnvCube);
  gl.depthFunc(gl.LEQUAL);
  gl.uniformMatrix4fv(programEnvCube.u_viewDirectionProjectionInverse, 
                      false, vpFromCameraInverse.elements);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMapTex);
  gl.uniform1i(programEnvCube.u_envCubeMap, 0);
  initAttributeVariable(gl, programEnvCube.a_Position, quadObj.vertexBuffer);
  gl.drawArrays(gl.TRIANGLES, 0, quadObj.numVertices);
  }
  //gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}




function initFrameBufferForCubemapRendering(gl){
  var texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);

  // 6 2D textures
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  for (let i = 0; i < 6; i++) {
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, 
                  gl.RGBA, offScreenWidth, offScreenHeight, 0, gl.RGBA, 
                  gl.UNSIGNED_BYTE, null);
  }

  //create and setup a render buffer as the depth buffer
  var depthBuffer = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, 
                          offScreenWidth, offScreenHeight);

  //create and setup framebuffer: linke the depth buffer to it (no color buffer here)
  var frameBuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, 
                              gl.RENDERBUFFER, depthBuffer);

  frameBuffer.texture = texture;

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  return frameBuffer;
}

function calculateTangentSpace(position, texcoord){
  //iterate through all triangles
  let tagents = [];
  let bitagents = [];
  let crossTexCoords = [];
  for( let i = 0; i < position.length/9; i++ ){
    let v00 = position[i*9 + 0];
    let v01 = position[i*9 + 1];
    let v02 = position[i*9 + 2];
    let v10 = position[i*9 + 3];
    let v11 = position[i*9 + 4];
    let v12 = position[i*9 + 5];
    let v20 = position[i*9 + 6];
    let v21 = position[i*9 + 7];
    let v22 = position[i*9 + 8];
    let uv00 = texcoord[i*6 + 0];
    let uv01 = texcoord[i*6 + 1];
    let uv10 = texcoord[i*6 + 2];
    let uv11 = texcoord[i*6 + 3];
    let uv20 = texcoord[i*6 + 4];
    let uv21 = texcoord[i*6 + 5];

    let deltaPos10 = v10 - v00;
    let deltaPos11 = v11 - v01;
    let deltaPos12 = v12 - v02;
    let deltaPos20 = v20 - v00;
    let deltaPos21 = v21 - v01;
    let deltaPos22 = v22 - v02;

    let deltaUV10 = uv10 - uv00;
    let deltaUV11 = uv11 - uv01;
    let deltaUV20 = uv20 - uv00;
    let deltaUV21 = uv21 - uv01;

    let r = 1.0 / (deltaUV10 * deltaUV21 - deltaUV11 * deltaUV20);
    for( let j=0; j< 3; j++ ){
      crossTexCoords.push( (deltaUV10 * deltaUV21 - deltaUV11 * deltaUV20) );
    }
    let tangentX = (deltaPos10 * deltaUV21 - deltaPos20 * deltaUV11)*r;
    let tangentY = (deltaPos11 * deltaUV21 - deltaPos21 * deltaUV11)*r;
    let tangentZ = (deltaPos12 * deltaUV21 - deltaPos22 * deltaUV11)*r;
    for( let j = 0; j < 3; j++ ){
      tagents.push(tangentX);
      tagents.push(tangentY);
      tagents.push(tangentZ);
    }
    let bitangentX = (deltaPos20 * deltaUV10 - deltaPos10 * deltaUV20)*r;
    let bitangentY = (deltaPos21 * deltaUV10 - deltaPos11 * deltaUV20)*r;
    let bitangentZ = (deltaPos22 * deltaUV10 - deltaPos12 * deltaUV20)*r;
    for( let j = 0; j < 3; j++ ){
      bitagents.push(bitangentX);
      bitagents.push(bitangentY);
      bitagents.push(bitangentZ);
    }
  }
  let obj = {};
  obj['tagents'] = tagents;
  obj['bitagents'] = bitagents;
  obj['crossTexCoords'] = crossTexCoords;
  return obj;
}