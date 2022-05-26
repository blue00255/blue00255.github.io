//require()是JsAPI的基础——Dojo框架规定的一个全局入口，与初学C语言时接触的main()函数类似。
//第一个参数，是一个字符串数组。它规定了接下来的代码需要用哪些类（官方说法叫模块）
//用字符串描述了所需类（模块）所在的包路径。与C#中using 命名空间类似。
//如"esri/views/SceneView"就代表引用esri这个包下的views这个包里的SceneView这个类
//因为第一个script标签引用的地址是“https://js.arcgis.com/4.23/”，所以esri这个包就是基于此目录下的相对路径了
//回调函数的形参列表均要与类引用列表中的类顺序上一一对应，但是名字可以自由，一般与官方的类名一致。
//container属性利用id选择器（不用写#）选择div。
//scale是比例尺，center是中央经纬度。

require([
  "esri/config",
  "esri/Map",
  "esri/views/SceneView",
  "esri/views/MapView",
  "esri/Graphic",
  "esri/core/watchUtils",
  "esri/renderers/SimpleRenderer",
  "esri/symbols/PolygonSymbol3D", //3D多边形符号用于在3D场景视图中渲染具有多边形几何的要素
  "esri/symbols/ExtrudeSymbol3DLayer",
  //拉伸Symbol3DLayer用于渲染多边形几何体，方法是从地面向上拉伸多边形几何体，从而创建3D体积对象。这是通过 SceneView 中的 PolygonSymbol3D 完成的
  "esri/layers/FeatureLayer",
  "esri/widgets/Legend",
  "esri/layers/GraphicsLayer",
  "esri/tasks/QueryTask",
  //"esri/tasks/support/Query",
  "esri/rest/support/Query",
  "esri/widgets/BasemapGallery",
], function (
  esriConfig,
  Map,
  SceneView,
  MapView,
  Graphic,
  watchUtils,
  SimpleRenderer,
  PolygonSymbol3D,
  ExtrudeSymbol3DLayer,
  FeatureLayer,
  Legend,
  GraphicsLayer,
  QueryTask,
  Query,
  BasemapGallery
) {
  // esriConfig.apiKey = "AAPK2c7001cf63cf4c32bde7e7db7b8e780cO5DpjPOSMxZdJoI4rQ-bXRVoQkZYrShAtQnTEfzo_r8a8ON9UYt-jZ3Pk3PF6k38";
  esriConfig.apiKey =
    "AAPK887f8dad38d2492fb0ad4c64459c3b1bIV5JfnwhDAUn9LjD3q9nBlGNpZzH425ZtyqvAjZTaQ_-TemXuQH5tXsrKdTtQgq0";
  //这是要查询的图层，也就是我们建模之后，上传的图层
  //var china ="https://services3.arcgis.com/U26uBjSD32d7xvm2/arcgis/rest/services/cug0425_WFL1/FeatureServer/0";

  var china =
    "https://services3.arcgis.com/U26uBjSD32d7xvm2/arcgis/rest/services/cug0525_WFL1/FeatureServer/0";
  //创建用于显示查询结果的图形层和符号
  var resultsLayer = new GraphicsLayer(); //图形层包含一个或多个客户端图形。图形图层中的每个图形都呈现在 SceneView 或 MapView 内的 LayerView 中
  //特征服务的地址
  var qTask = new QueryTask({
    url: china, //任务中使用的ArcGIS Server REST服务URL(通常是要素服务图层或地图服务图层的URL)。
  });
  //设置查询参数以始终返回几何图形和所有字段。
  //返回几何图形允许我们在地图/视图中显示结果
  //此类定义用于从图层或图层视图中执行要素查询的参数。
  //一旦定义了查询对象的属性，就可以将其传递给一个可执行函数，该函数将返回FeatureSet（要素集合）。
  var params = new Query({
    returnGeometry: true,
    outFields: ["*"],
  });

  // 查询结果弹出设置的模板
  var popupTemplate = {
    title: "类型,名字,楼层,高度<br>{type},{name},{floor},{height}", //弹出的提示框，title为类型、名字、楼层、高度
    fieldInfos: [
      {
        fieldName: "name",
        label: "name",
      },
    ],
    content: "<br><b>查询建筑为:</b> {name}", //着重显示查询的建筑名称
  };

  function getSymbol(color) {
    //由于不同的label不同的渲染效果，定义一个函数，每个都调用这个函数，正常情况是上面的函数，这里只有color这一个变量
    return {
      type: "polygon-3d",
      symbolLayers: [
        {
          type: "extrude", ////必须将ExtrudeSymbol3DLayer添加到多边形Symbol3D 的属性中
          material: {
            color: color,
          },
          edges: {
            type: "solid",
            color: "#999",
            size: 0.5,
          },
        },
      ],
    };
  }
  //渲染器，这次是根据建模数据中的height来进行实际高度渲染
  //  UniqueValueRenderer允许您基于一个或多个匹配的字符串属性对图层中的要素进行符号化。
  //  这通常是通过使用唯一的颜色、填充样式或图像来表示字符串字段中具有相同值的要素来实现的
  // 构造渲染器时，必须指定用于定义唯一类型的字符串字段。
  // 还必须使用addUniqueValueInfo()方法或构造函数中的uniqueValueInfos属性来定义每个类型及其关联的符号。
  const renderer = {
    type: "unique-value",
    //  渲染器类型为UniqueValueRenderer，这个允许您基于一个或多个匹配的字符串属性对图层中的要素进行符号化。
    //  这通常是通过使用唯一的颜色、填充样式或图像来表示字符串字段中具有相同值的要素来实现的
    defaultSymbol: getSymbol("#FFFFFF"),
    //用于绘制其值与渲染器不匹配或不由渲染器指定的要素的默认符号。
    defaultLabel: "Other", //除了下面四个类型的以外，其他的都默认为other
    field: "TYPE", //渲染器用于匹配唯一值或类型的属性字段的名称。
    uniqueValueInfos: [
      {
        value: "culandsport", //文体建筑 具有该值的要素将使用给定的符号进行渲染。
        symbol: getSymbol("#149ECE"), //调用上面的函数，用这个颜色进行渲染
        label: "culandsport",
      },
      {
        value: "university", //教学楼等设施
        symbol: getSymbol("#FC921F"),
        label: "university",
      },
      {
        value: "dormitory", //宿舍  //餐厅
        symbol: getSymbol("#ED5151"),
        label: "dormitory",
      },
      // {
      //   value: "library",   //标志性建筑，图书馆
      //   symbol: getSymbol("#149ECE"),
      //   label: "library"
      // }
    ],
    visualVariables: [
      //根据上面匹配的type类型，这个属性允许使用者根据height属性拉伸高度
      {
        type: "size",
        field: "HEIGHT",
      },
    ],
  };

  const buildingsLayer = new FeatureLayer({
    url: china,
    renderer: renderer,
    elevationInfo: {
      mode: "on-the-ground",
    },
    title: "Extruded building footprints",
    popupTemplate: {
      //弹出的提示框模板
      title: "{TYPE}", //标题是模型的type
      content: [
        {
          type: "fields",
          fieldInfos: [
            //建筑的类型
            {
              fieldName: "TYPE",
              label: "Type",
            },
            {
              fieldName: "HEIGHT", //建筑的高度
              label: "Height",
            },
            {
              fieldName: "name", //建筑的名字
              label: "name",
            },
          ],
        },
      ],
    },
    outFields: ["TYPE", "HEIGHT", "name"],
  });
  // 创建一个地图作为主视图，这个地图中添加我们建模好的图层
  var mainMap = new Map({
    basemap: "hybrid", //basemap属性可使用预置的底图
    ground: "world-elevation", //ground属性表示地图高程，可以用预置的世界高程数据，也可以自定义高程图层
    layers: [buildingsLayer, resultsLayer], //layers属性是可操作的Layer对象的集合，Layer类有很多子类，如几何图层、地图图层、要素图层等
  });

  // 创建一个地图作为右上角总览视图
  var overviewMap = new Map({
    basemap: "topo-vector",
  });

  // 建立一个三维视图显示3D Map实例
  var cug_3DView = new SceneView({
    container: "cug_3DviewDiv", //将三维地图放进对应div中
    map: mainMap,
    camera: {
      //camera就是加载三维图的视角
      position: {
        latitude: 30.450027,
        longitude: 114.6136256,
        z: 800,
      },
      heading: 0, //相机的罗盘航向，以度为单位。当屏幕顶部是北方时，航向为零。当视图顺时针旋转时，它会增加。角度总是在0到360度之间标准化。
      tilt: 55, //倾斜
    },
  });
  const basemapGallery = new BasemapGallery({
    view: cug_3DView,
    container: basegally,
  });
  cug_3DView.ui.add(basemapGallery);
  // Register events to control
  const rotateAntiClockwiseSpan = document.getElementById(
    //获取逆时针旋转按钮
    "rotateAntiClockwiseSpan"
  );
  const rotateClockwiseSpan = document.getElementById(
    //获取顺时针旋转按钮
    "rotateClockwiseSpan"
  );
  const indicatorSpan = document.getElementById("indicatorSpan"); //内外旋转

  //添加事件，点击这个按钮时，调用这个函数
  rotateClockwiseSpan.addEventListener("click", () => {
    rotateView(-1);
  });
  rotateAntiClockwiseSpan.addEventListener("click", () => {
    rotateView(1);
  });
  indicatorSpan.addEventListener("click", tiltView);

  // Watch the change on view.camera
  cug_3DView.watch("camera", updateIndicator);

  //传入的是-1，逆时针旋转
  //传入的是1，顺时针旋转
  function rotateView(direction) {
    let heading = cug_3DView.camera.heading; //获取相机的罗盘航向，以度为单位。当屏幕顶部是北方时，航向为零。当视图顺时针旋转时，它会增加。角度总是在0到360度之间标准化。

    if (direction > 0) {
      heading = Math.floor((heading + 1e-3) / 90) * 90 + 90;
    } else {
      heading = Math.ceil((heading - 1e-3) / 90) * 90 - 90;
    }

    cug_3DView
      .goTo({
        heading: heading,
      })
      .catch((error) => {
        if (error.name != "AbortError") {
          console.error(error);
        }
      });
  }

  //内外旋转的函数
  function tiltView() {
    let tilt = cug_3DView.camera.tilt + 1e-3; //获取倾斜角度

    //倾斜角度在三个方向变化
    if (tilt >= 80) {
      tilt = 0;
    } else if (tilt >= 40) {
      tilt = 80;
    } else {
      tilt = 40;
    }

    cug_3DView
      .goTo({
        tilt: tilt,
      })
      .catch((error) => {
        if (error.name != "AbortError") {
          console.error(error);
        }
      });
  }

  //更新指示器
  function updateIndicator(camera) {
    let tilt = camera.tilt;
    let heading = camera.heading;

    const transform = `rotateX(${
      0.8 * tilt
    }deg) rotateY(0) rotateZ(${-heading}deg)`;
    indicatorSpan.style["transform"] = transform;
  }

  //经度114.6136256°，纬度30.4500270    这个是最合适的经纬度，可以正确显示出校园全貌

  //测试合适的经纬度
  //经度114.6163206°，纬度30.4611719°  左下角   跑到右上去了
  //经度114.6294358°，纬度30.4606739°  右下角   更右上了
  //经度114.6167338°，纬度30.4658412°  左上角
  //经度114.6286273°，纬度30.4664482°  右上角
  //经度114.6246838°，纬度30.4623782°  图书馆
  //114.5955158°，纬度30.4509610°   114.6147395°，纬度30.4584325°  经度114.6003667°，纬度30.4587750°
  //114.6090982°，纬度30.4483458°    经度114.6001870°，纬度30.4551326°  经度114.6007260°，纬度30.4457928
  //经度114.6099606°，纬度30.4601135  经度114.6099246°，纬度30.4540119°
  //经度114.6098887°，纬度30.4500892   114.6136256°，纬度30.4500270

  // 当按钮点击的时候执行doquery方法
  cug_3DView.when(function () {
    //对button不做设置，其在地图外面
    document.getElementById("butt").addEventListener("click", doQuery);
  });
  var value = document.getElementById("valSelect"); //获取输入值
  //每次按钮点击时执行的函数
  function doQuery() {
    // 清除以前图层的查询
    resultsLayer.removeAll();
    //拼写查询的 SQL语句，模糊查询，使用like
    params.where = "name like '%" + value.value + "%'";
    //成功执行查询并调用getresult方法，
    //查询失败调用promiserejected方法
    qTask.execute(params).then(getResults).catch(promiseRejected);
  }
  // 成功调用时执行的方法
  function getResults(response) {
    // 循环每一个结果并标记符号和弹出框模板
    // 并使它们每一个都在地图上显示出来
    var peakResults = response.features.map(function (feature) {
      feature.popupTemplate = popupTemplate;
      return feature;
    });
    //向结果图层中添加刚找到的全部特征要素图层
    resultsLayer.addMany(peakResults);
    //将图形添加到地图上之后展示弹框
    cug_3DView
      .goTo(peakResults)
      .then(function () {
        cug_3DView.popup.open({
          features: peakResults,
          updateLocationEnabled: true,
        });
      })
      .catch(function (error) {
        if (error.name != "AbortError") {
          console.error(error);
        }
      });
    // 输出查询结果
    document.getElementById("result").innerHTML =
      peakResults.length + " 个类似的建筑被查找到";
  }
  // 查询失败
  function promiseRejected(error) {
    console.error("Promise rejected: ", error.message);
  }

  //  建立一个二维视图渲染显示2D Map实例
  var mapView = new MapView({
    container: "cug_2DviewDiv", //将右上角的二维地图放进对应div中
    map: overviewMap,
    constraints: {
      rotationEnabled: false,
    },
  });

  //把esri加载所附带的放大按钮等小部件给删除
  mapView.ui.components = [];

  //就是等待用户移动主地图
  //when就是加载完之后等待用户操作地图发生的事件

  /*，因为发生变化的是cug_2DviewDiv，也就是左上角的2D视图，所以给它添加方法，但是他的变化是随着主地图cug_3DviewDiv变化而变化，
    所以又写一层主地图的when事件，最后因为主地图改变，执行setup方法。有点像C#里面的委托，
    执行过程就是mapView看管着小地图，然后平时就是看着SceneView，如果SceneView变化，则它就变化。
    */

  mapView.when(function () {
    cug_3DView.when(function () {
      setup();
    });
  });
  // 一个graphic类包括四个基本的参数：一个geometer,一个symbol,attribute和infoTemplate.
  // Grpaphic只能显示在GraphicsLayer对象中，即在GraphicLayer上监听Graphic对象。
  // 两种实例化的方式：
  // new Graphic(geometry,symbol,attributes,infoTemplate)
  // new Grpahic(json)
  // geometry : 描绘图形的位置（坐标），和图形类别（点，线，面）
  // symbol : 图形的样式，常用属性有图形类型，颜色，外边线的颜色和宽度等

  // 地图上的显示内容，可以有各种各样的图，还有一个就是绘制的图，比如点线面，后面绘制的，统统在Graphic这个类里面。
  // 想要画一个东西并显示在地图上，就得实例化一个Graphic，然后用mapView的 graphics属性去接收

  function setup() {
    //创建一个几何图形,setup是when调用的方法
    const extent3Dgraphic = new Graphic({
      geometry: null,
      symbol: {
        type: "simple-fill",
        color: [0, 0, 0, 0.5],
        outline: null,
      },
    });
    //   一开始实例化graphic的设置为空，就是因为每移动一次图，就得把原来的graphic清除，那很麻烦的，
    //   直接声明一个常量，后面通过改变属性geometry就好。每次运行都给他重新设置为空,提高了效率。

    mapView.graphics.add(extent3Dgraphic); //将矩形图形加到二维地图中
    //watchUtils.init监视属性的更改，并使用该属性的初始值调用回调。

    //作用就是右上角的小地图随着主地图显示范围
    //这里监视了cug_3DView，用户拖动地图，extent（范围）会变化
    watchUtils.init(cug_3DView, "extent", function (extent) {
      if (cug_3DView.stationary) {
        mapView
          .goTo({
            center: cug_3DView.center,
            scale:
              cug_3DView.scale *
              2 *
              Math.max(
                cug_3DView.width / mapView.width,
                cug_3DView.height / mapView.height
              ),
          })
          .catch(function (error) {
            // ignore goto-interrupted errors
            if (error.name != "view:goto-interrupted") {
              console.error(error);
            }
          });
      }
      extent3Dgraphic.geometry = extent;
    });
  }
});
