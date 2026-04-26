// ===== Signature Canvas (재사용 컴포넌트) =====
function SignatureCanvas(canvas, clearBtn) {
  var ctx = canvas.getContext('2d');
  var isDrawing = false;
  var lastX = 0, lastY = 0;

  function setup() {
    var parent = canvas.parentElement;
    var w = (parent && parent.clientWidth > 0) ? parent.clientWidth : 320;
    canvas.width = w;
    canvas.height = 120;
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }

  function getPos(e) {
    var rect = canvas.getBoundingClientRect();
    var touch = e.touches ? e.touches[0] : e;
    return {
      x: (touch.clientX - rect.left) * (canvas.width / rect.width),
      y: (touch.clientY - rect.top) * (canvas.height / rect.height)
    };
  }

  function startDraw(e) {
    isDrawing = true;
    var p = getPos(e);
    lastX = p.x; lastY = p.y;
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
  }

  function draw(e) {
    if (!isDrawing) return;
    var p = getPos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastX = p.x; lastY = p.y;
  }

  function endDraw() { isDrawing = false; }

  canvas.addEventListener('mousedown', startDraw);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', endDraw);
  canvas.addEventListener('mouseleave', endDraw);

  canvas.addEventListener('touchstart', function(e) { e.preventDefault(); startDraw(e); }, { passive: false });
  canvas.addEventListener('touchmove',  function(e) { e.preventDefault(); draw(e); },  { passive: false });
  canvas.addEventListener('touchend',   endDraw);

  clearBtn.addEventListener('click', function() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  });

  // Public API
  this.resize = function() { setup(); };
  this.clear  = function() { ctx.clearRect(0, 0, canvas.width, canvas.height); };

  this.isEmpty = function() {
    var d = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (var i = 3; i < d.length; i += 4) {
      if (d[i] > 10) return false;
    }
    return true;
  };

  this.toDataURL = function() {
    return this.isEmpty() ? '' : canvas.toDataURL('image/png');
  };

  // 초기화는 첫 번째 resize() 호출에서 수행
}
