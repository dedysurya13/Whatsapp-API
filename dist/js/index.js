$(document).ready(function() {
  var socket = io();

  socket.on('message', function(msg) {
    $('.logs').prepend($('<li>').text(msg));
  });

  socket.on('notification', function(msg) {
    $('#badgeStatusServer').text(msg);
  });

  socket.on('response', function(msg) {
    $('#responseServer').html(JSON.stringify(msg, null, 4));
    // alert(msg)
  });

  socket.on('message_ack', function(msg) {
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
    setTimeout(function(){
      cekBot();
    },5000)
  });
});

const wWebJs = window.location.origin;
$('#titleWwebJs, #serverWwebJs').html(wWebJs)

setInterval(function(){
  $('.logs').empty();
}, 1000*60*60*24) //24 jam

setInterval(function(){
  cekBot();
}, 1000*60*60*3) //3 jam

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
      console.log('gagal kirim');
    }
  });
}