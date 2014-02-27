(function() {
	var SDK_KEY = '4d517cab76a6bf004a79e42057ee97006af42044';

	// DOM utilites like jQuery
	var ui = {
		el: function(id) {
			return document.getElementById(id);
		},

		elByTag: function(tagName, scope) {
			return (scope || document).getElementsByTagName(tagName);
		},

		elByClass: function(className, scope) {
			return (scope || document).getElementsByClassName(className);
		},

		on: function(eventName, elements, handler) {
			if(elements.length) {
				Array.prototype.forEach.call(elements, function(el) {
					el.addEventListener(eventName, handler, false);
				});
			}
			else elements.addEventListener(eventName, handler, false);
		},

		addClass: function(className, elements) {
			if(elements.length) {
				Array.prototype.forEach.call(elements, function(el) {
					el.classList.add(className);
				});
			}
			else elements.classList.add(className);
		},

		removeClass: function(className, elements) {
			if(elements.length) {
				Array.prototype.forEach.call(elements, function(el) {
					el.classList.remove(className);
				});
			}
			else elements.classList.remove(className);
		},

		hide: function(el) {
			el.style.display = "none";
		},

		show: function(el) {
			el.style.display = "";
		}
	};

	// Observer
	var Ob = {
		on: function(eventName, handler, scope) {
			if(typeof eventName !== "string" || typeof handler !== "function") return false;
			if(!this._events) this._events = {};
			if(!this._events[eventName]) this._events[eventName] = [];
			this._events[eventName].push({
				handler: handler,
				scope: scope
			});
		},

		fireEvent: function(eventName, params) {
			var listeners = this._events[eventName];
			if(listeners) {
				// make it asynchronious
				setTimeout(function(){
					listeners.forEach(function(listener) {
						listener.handler.call(listener.scope, params);
					});
				}, 0);
			}
		}
	};

	var Mediator = {
		start: function(facade, loader) {
			facade.on('next', loader.getNextPhoto, loader);
			loader.on('photo', facade.showPhoto, facade);
			facade.init();
			facade.getNextPhoto();
		}
	};

	var Observable = function(obj) {
		for(p in obj) {
			if(obj.hasOwnProperty(p)) {
				this[p] = obj[p];
			}
		}
	};
	Observable.prototype = Ob;

	var Facade = {
		// cached DOM elements
		ePhotoLoader: ui.el('loader'),
		ePhotoName: ui.el('photoName'),
		ePhotoOwner: ui.el('photoOwner'),
		ePhotoCategory: ui.el('photoCategory'),
		ePhotoDescription: ui.el('photoDescr'),
		eThumbsBar: ui.el('thumbsBar'),

		// image elements where will be show photos
		topImg: ui.el('photo2'),
		backImg: ui.el('photo1'),

		// container fot the thumbnails
		thumbs: {},
		preloadImg: new Image(),
		// index of a image in the thumbnils list
		index: 0,

		feature: 'popular',
		category: '',

		cachedPhoto: null,
		// hash for deterime category name by number
		categories: {},

		init: function() {
			var eCats = ui.el('categories'),
				ulInnerHTML = '', 
				href = '',
				me = this;

			// init categories
			[
				"0=All",
				"10=Abstract",
				"11=Animals",
				"5=Black and White",
				"1=Celebrities",
				"9=City and Architecture",
				"15=Commercial",
				"16=Concert",
				"20=Family",
				"14=Fashion",
				"2=Film",
				"24=Fine Art",
				"23=Food",
				"3=Journalism",
				"8=Landscapes",
				"12=Macro",
				"18=Nature",
				"4=Nude",
				"7=People",
				"19=Performing Arts",
				"17=Sport",
				"6=Still Life",
				"21=Street",
				"26=Transportation",
				"13=Travel",
				"22=Underwater",
				"27=Urban Exploration",
				"25=Wedding"
			].forEach(function(cat) {
				var ss = cat.split('='),
					catName = ss[1];
				if(ss[0] != 0) me.categories[ss[0]] = catName;
				ulInnerHTML += '<li><a href="#'+ catName.replace(/ /g, '-') +'">'+ catName +'</a></li>';
			});
			eCats.innerHTML = ulInnerHTML;

			// init nav actions
			ui.on('click', ui.elByTag('a'), function(e) {
				if(this.href === "#") e.preventDefault();
			});

			// select feature action
			ui.on('click', ui.elByTag('a', ui.el('features')), function(e) {
				var freshTop = ui.el('freshTop'),
					f = this.href.split('#')[1];
				if(f){
					freshTop.innerText = 'Fresh';
					ui.removeClass('active', ui.elByTag('li', ui.el('features')));
					this.parentNode.classList.add('active');
					if(f.substr(0, 5) === 'fresh'){
						freshTop.innerText += ' '+ this.innerText;
						freshTop.parentNode.classList.add('active');
					}
					me.getNextPhoto({feature: f});
				}
				e.preventDefault();
			});

			// select category action
			var eCategoryTop = ui.el('categoryTop');
			ui.on('click', ui.elByTag('a', eCats), function(e) {
				var href = this.href,
					cat = href.split('#')[1].replace(/-/g, ' ');
				cat = cat !== 'All' ? cat : '';

				var el = eCats.getElementsByClassName('active')[0];
				el && el.classList.remove('active');
				this.parentNode.classList.add('active');
				eCategoryTop.innerText = cat || 'Category';
				eCategoryTop.href = href;

				me.getNextPhoto({category: cat});
				e.preventDefault();
			});

			// next image action
			ui.on('click', ui.el('desk'), nextHandler);
			ui.on('click', ui.el('btnNext'), nextHandler);
			ui.on('click', ui.el('btnPrev'), function() {
				if(me.index > 0) {
					me.showByIndex(me.index - 1);
				}
			});
			var toId;
			ui.on('click', ui.el('btnPlay'), function() {
				if(toId) {
					clearTimeout(toId);
					toId = null;
					this.innerText = "Slideshow";
					return;
				}
				this.innerText = "Stop";
				var duration = parseInt(ui.el('showDuration').value) || 5;
				nextHandler();
				toId = setTimeout(function() {
					nextHandler();
					toId = setTimeout(arguments.callee, (parseInt(ui.el('showDuration').value) || 5) * 1000);
				}, duration * 1000);
			});

			me.topImg.onload = imgLoadHandler;
			me.backImg.onload = imgLoadHandler;

			// init onload image action
			me.preloadImg.onload = function() {
				me.isLoading = false;
				ui.hide(me.ePhotoLoader);
				me.addThumb(me.cachedPhoto);
				if(me.doShowCahed) {
					me.doShowCahed = false;
					me.showPhoto(me.cachedPhoto);
				}
			};

			function nextHandler() {
				me.showByIndex(me.index + 1);
			}

			function imgLoadHandler() {
				ui.el('desk').style.height = this.height +'px';
			}
		},

		getNextPhoto: function(params) {
			// console.log("Get next photo:", params);
			if(params) {
				if(params.feature) this.feature = params.feature;
				if(typeof params.category !== "undefined") this.category = params.category;

				var thumbs = this.getThumbs(),
					html = '',
					lastPhotoUrl;
				
				this.index = thumbs.index;

				thumbs.photos.forEach(function(photo, i) {
					html += '<a href="#'+ i +'"'+ (i === thumbs.index ? ' class="active"':'') +'>'
						+'<img class="thumb" src="'+ photo.image_url +'"/></a>';
					lastPhotoUrl = photo.image_url;
				});
				this.eThumbsBar.innerHTML = html;
				if(lastPhotoUrl) {
					var me = this;
					ui.on('click', this.eThumbsBar.children, this.onThumbClick.bind(this));

					if(this.isTransition) {
						this.backImg.src = lastPhotoUrl;
					}
					else
						this.topImg.src = lastPhotoUrl;
					return this.showPhoto(thumbs.photos[this.index]);
				}
				this.cachedPhoto = null;
			}
			else {
				if(this.cachedPhoto && !this.toCache) {
					if(this.isLoading) {
						this.doShowCahed = true;
						return;
					}
					this.index++;
					this.showPhoto(this.cachedPhoto);
					this.toCache = true;
				}
			}
			if(!this.toCache) ui.show(this.ePhotoLoader);
			this.fireEvent('next', {feature: this.feature, category: this.category});
		},

		showPhoto: function(photo) {
			var me = this;

			if(me.toCache) {
				// console.log("Cache photo:", photo);
				me.isLoading = true;
				me.preloadImg.src = photo.image_url;
				me.cachedPhoto = photo;
				me.toCache = false;
				return;
			}
			// console.log("Show photo:", photo);


			me.ePhotoName.innerHTML = photo.name;
			me.ePhotoOwner.innerHTML = '&copy; by '+ photo.user.fullname +', '+ photo.created_at.substr(0, 10);
			me.ePhotoCategory.innerHTML = me.categories[photo.category];
			me.ePhotoDescription.innerHTML = photo.description;
			ui.el('details').href = 'http://500px.com/photo/'+ photo.id;

			if(me.isTransition) {
				me.nextImageUrlToShow = photo.image_url;
			}
			else {
				me.beginTransition(photo.image_url);
			}

			if(!me.cachedPhoto) {
				ui.hide(me.ePhotoLoader);
				me.addThumb(photo);
			}
			me.setActiveThumb();
		},

		showByIndex: function(i) {
			var thumbs = this.getThumbs();
			if(thumbs.photos.length > i) {
				this.index = i;
			}
			else {
				this.index = 0;
			}
			this.showPhoto(thumbs.photos[this.index]);
		},

		beginTransition: function(imageUrl) {
			this.backImg.src = imageUrl;
			ui.show(this.backImg.parentNode);
			this.topImg.parentNode.style.opacity = 0;
			this.isTransition = true;
			setTimeout(this.onFadeEnd.bind(this), 1000);
		},

		onFadeEnd:	function () {
			this.isTransition = false;

			var t = this.topImg;
			this.topImg = this.backImg;
			this.backImg = t;

			this.topImg.parentNode.style.zIndex = 1;
			var eStyle = this.backImg.parentNode.style;
			eStyle.zIndex = 0;
			eStyle.display = "none";
			eStyle.opacity = "";

			if(this.nextImageUrlToShow) {
				this.beginTransition(this.nextImageUrlToShow);
				this.nextImageUrlToShow = '';
			}
		},

		getThumbs: function() {
			var by = this.feature + this.category,
				thumbs = this.thumbs[by];

			if(!thumbs) {
				thumbs = this.createThumb();
				this.thumbs[by] = thumbs;
			}
			return thumbs;
		},

		addThumb: function(photo) {
			var thumbs = this.getThumbs();

			if(thumbs.photos.length && photo.id === thumbs.photos[0].id) {
				if(!this.cachedPhoto) this.index = 0;
				return;
			}
			thumbs.photos.push(photo);

			var a = document.createElement('a');
			a.href = '#'+ (thumbs.photos.length - 1);
			a.innerHTML = '<img class="thumb" src="'+ photo.image_url +'"/>';

			var tb = this.eThumbsBar;
			tb.appendChild(a);
			ui.on('click', a, this.onThumbClick.bind(this));
			tb.scrollLeft = tb.scrollWidth - tb.clientWidth;
		},

		onThumbClick: function(e) {
			var a = e.target.parentNode;
			this.showByIndex(parseInt(a.href.split('#')[1]));
			e.preventDefault();
		},

		setActiveThumb: function() {
			var thumbs = this.getThumbs();

			var a = ui.elByClass('active', this.eThumbsBar)[0];
			if(a) ui.removeClass('active', a);

			a = this.eThumbsBar.children[this.index];
			if(!a) {
				this.index = 0;
				a = this.eThumbsBar.children[0];
				if(!a) return;
			}
			ui.addClass('active', a);
			thumbs.index = this.index;
			if(thumbs.index === thumbs.photos.length - 1) {
				this.toCache = true;
				this.getNextPhoto();
			}
			a.scrollIntoView();
		},

		createThumb: function() {
			return {
				photos: [],
				index: 0
			}
		}
	};

	var Loader = {
		// records per page
		rpp: 20,

		cache: {},

		isReady: false,

		getNextPhoto: function (params){
			feature = params.feature;
			category = params.category;

			var by = feature + category,
				cache = this.cache[by],
				me = this;

			if(cache){
				if(cache.cursor < cache.photos.length){
					// console.log("Load photo from cache:", cache.cursor);
					me.fireEvent('photo', cache.photos[cache.cursor++]);
					return;
				}else{
					cache.page++;
				}
			}else{
				cache = { photos:[], page: 1, cursor: 0 };
				me.cache[by] = cache;
			}

			var options = {
					feature: feature,
					image_size: 4,
					page: cache.page,
					rpp: me.rpp
				};

			if(category){
				options.only = category;
			}

			me.load(options, cache, function(err){
				if(err) alert(err);
				else {
					// console.log("Load photo:", cache.cursor);
					me.fireEvent('photo', cache.photos[cache.cursor++]);
				}
			});
		},

		load: function(options, cache, done) {
			if(!this.isReady) {
				_500px.init({
					sdk_key: SDK_KEY
				});
				this.isReady = true;
			}

			_500px.api('/photos', options, function (response) {
				if (response.success) {
					if(response.data.photos.length == 0){
						cache.cursor = 0;
					}
					else cache.photos = cache.photos.concat(response.data.photos);
					done();
				} else {
					done('Unable to complete request: ' + response.status + ' - ' + response.error_message);
				}
			});
		}
	};

	window.onload = function() {
		var facade = new Observable(Facade),
			loader = new Observable(Loader);

		Mediator.start(facade, loader);
	};
})();
