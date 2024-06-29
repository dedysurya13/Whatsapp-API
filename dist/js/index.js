$(document).ready(function() {
  var socket = io();

  socket.on('message', function(msg) {
    $('.logs').prepend($('<li>').text(msg));
  });

  socket.on('qr', function(src) {
    $('#qrcode').attr('src', src);
    $('#qrcode').show();
  });

  socket.on('ready', function(data) {
    $('#qrcode').hide();
  });

  socket.on('authenticated', function(data) {
    $('#qrcode').hide();
  });
});

const wWebJs = window.location.origin;
$('#titleWwebJs, #serverWwebJs').html(wWebJs)

cekBot();

setInterval(function(){
  cekBot();
}, 60000*180) // 180 menit / 3 jam

function cekBot(){
  let dt = moment().locale('id').format('LLLL')

  $.ajax({
    type: "POST",
    url: 'http://localhost:8000/send-group-message',
    data: {
      id : '120363023663218405@g.us',
      message: wWebJs+'\n'+dt
    },
    success: function(data) {
      console.log('terkirim');
    },
    error: function() {
      console.log('gagal');
    }
  });
}