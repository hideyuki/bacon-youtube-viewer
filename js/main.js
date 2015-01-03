// YouTube
function initPlayer() {
  var params = { allowScriptAccess: "always" };
  var atts = { id: "ytapiplayer" };
  swfobject.embedSWF(
    "http://www.youtube.com/v/t6maVVFs0As?enablejsapi=1&playerapiid=ytapiplayer&version=3",
    "ytapiplayer",
    "425",
    "356",
    "8",
    null,
    null,
    params,
    atts
  );
}

function initYouTubeStream() {
    Bacon.fromCallback(function(callback){
    window.onYouTubePlayerReady = function(playerId) {
      var ytplayer = $("#ytapiplayer")[0];
      ytplayer.addEventListener("onStateChange", "onStateChange");
      callback(playerId);
    };
  });
  Bacon.fromBinder(function(callback){
    window.onStateChange = function(state){
      callback(state);
    }
  })
  ;
}


// Search
function initSearchStream() {
  var text = $("#search_text")
    .asEventStream("keydown")
    .debounce(300)
    .map(function(event){
      return event.target.value
    })
    .skipDuplicates()
  ;

  var suggestions = text
    .flatMapLatest(function(text){
      if(text.length < 3){
        return Bacon.once([]);
      }
      return Bacon.fromPromise($.getJSON(
        "http://gdata.youtube.com/feeds/api/videos?callback=?",
        {
          "vq": text,
          "max-results": 5,
          "alt": "json-in-script"
        }
      ));
    })
  ;

  text.awaiting(suggestions).onValue(function(x){
    if(x) $("#search_results").html("Searching...");
  });

  suggestions
    .map(function(data){
      return (!data || data.length==0) ? [] : data.feed.entry;
    })
    .onValue(function(results){
      var temp = Handlebars.compile($("#tmp_search_result").html());
      $("#search_results").html($.map(results, function(result){
        return temp({
          vid: result.id.$t.split("videos/")[1],
          thumbnail_url: result.media$group.media$thumbnail[0].url,
          title: result.media$group.media$title.$t,
          duration: function(){
            var time = result.media$group.yt$duration.seconds;
            var minutes = "0" + Math.floor(time / 60);
            var seconds = "0" + (time - minutes * 60);
            return minutes.substr(-2) + ":" + seconds.substr(-2);
          }
        });
      }));
    })
  ;

  // Click search result with jQuery live selector
  $("#search_results")
    .asEventStream("click", ".search_result")
    .map(function(element){
      return $(element.currentTarget).data("vid");
    })
    .onValue(function(vid){
      $("#ytapiplayer")[0].loadVideoById(vid);
    })
  ;
}


$(function(){
  initYouTubeStream();
  initPlayer();
  initSearchStream();
});