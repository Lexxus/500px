(function() {
	function DocExt() {
		this.el = function(id) {
			return document.getElementById(id);
		};

		this.elByTag = function(tagName, scope) {
			return (scope || document).getElementsByTagName(tagName);
		};

		this.on = function(eventName, elements, handler) {
			if(elements.length) {
				Array.prototype.forEach.call(elements, function(el) {
					el.addEventListener(eventName, handler, false);
				});
			}
			else elements.addEventListener(eventName, handler, false);
		};

		this.removeClass = function(className, elements) {
			if(elements.length) {
				Array.prototype.forEach.call(elements, function(el) {
					el.classList.remove(className);
				});
			}
			else elements.classList.remove(className);
		};

		this.hide = function(el) {
			el.style.display = "none";
		};

		this.show = function(el) {
			el.style.display = "";
		};
	}
	DocExt.prototype = document;

	doc = new DocExt();


	var app = {
		categories: {},

		feature: 'popular',
		category: '',

		// records per page
		rpp: 20,

		topImg: doc.el('photo2'),
		backImg: doc.el('photo1'),

		ePhotoLoader: doc.el('loader'),
		ePhotoName: doc.el('photoName'),
		ePhotoOwner: doc.el('photoOwner'),
		ePhotoCategory: doc.el('photoCategory'),
		ePhotoDescription: doc.el('photoDescr'),

		cache: {},
		thumbs: {},
		preloadImg: new Image(),


		init: function() {
			var eCats = doc.el('categories'),
				ulInnerHTML = '', 
				href = '',
				me = this;

			_500px.init({
				sdk_key: '4d517cab76a6bf004a79e42057ee97006af42044'
			});

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
			doc.on('click', doc.elByTag('a'), function(e) {
				if(this.href === "#") e.preventDefault();
			});
			// select feature action
			doc.on('click', doc.elByTag('a', doc.el('features')), function(e) {
				var freshTop = doc.el('freshTop'),
					f = this.href.split('#')[1];
				if(f){
					freshTop.innerText = 'Fresh';
					me.feature = f;
					doc.removeClass('active', doc.elByTag('li', doc.el('features')));
					this.parentNode.classList.add('active');
					if(f.substr(0, 5) === 'fresh'){
						freshTop.innerText += ' '+ this.innerText;
						freshTop.parentNode.classList.add('active');
					}
					me.getNextPhoto();
				}
				return false;
			});
			// select category action
			var eCategoryTop = doc.el('categoryTop');
			doc.on('click', doc.elByTag('a', eCats), function(e) {
				var href = this.href,
				cat = href.split('#')[1].replace(/-/g, ' ');
				me.category = cat !== 'All' ? cat : '';
				var el = eCats.getElementsByClassName('active')[0];
				el && el.classList.remove('active');
				this.parentNode.classList.add('active');
				eCategoryTop.innerText = me.category ? cat : 'Category';
				eCategoryTop.href = href;

				me.getNextPhoto();
				return false;
			});
			// next image action
			doc.on('click', doc.el('desk'), function(e) {
				me.getNextPhoto();
			});
			doc.on('click', doc.el('btnNext'), function(e) {
				me.getNextPhoto();
			});
			// init onload image action
			me.preloadImg.onload = function() {
				me.isLoading = false;
				doc.hide(me.ePhotoLoader);
				if(me.isNeedResize) {
					doc.el('desk').style.height = this.height;
					me.isNeedResize = false;
				}
				me.addThumbs(this.src);
			};

			this.getNextPhoto();
		},

		getNextPhoto: function (isPreload, feature, category){
			var done = isPreload ? this.preloadPhoto : this.showPhoto;
			feature = feature || this.feature;
			category = category || this.category;

			var by = feature + (category || ''),
				cache = this.cache[by];

			if(cache){
				if(cache.cursor < cache.photos.length){
					done.call(this, cache.photos[cache.cursor], cache);
					return cache;
				}else{
					cache.page++;
				}
			}else{
				cache = { photos:[], page: 1, cursor: 0 };
				this.cache[by] = cache;
			}

			var options = {
					feature: feature,
					image_size: 4,
					page: cache.page,
					rpp: this.rpp
				},
				me = this;

			if(category){
				options.only = category;
			}

			if(!isPreload) doc.show(this.ePhotoLoader);

			_500px.api('/photos', options, function (response) {
				if (response.success) {
					if(response.data.photos.length == 0){
						cache.cursor = 0;
					}
					else cache.photos = cache.photos.concat(response.data.photos);

					done.call(me, cache.photos[cache.cursor], cache);
				} else {
					alert('Unable to complete request: ' + response.status + ' - ' + response.error_message);
				}
			});

			return cache;
		},

		showPhoto: function(photo, cache) {
			var me = this;
			cache.cursor++;
			doc.hide(this.ePhotoLoader);
			me.ePhotoName.innerHTML = photo.name;
			me.ePhotoOwner.innerHTML = '&copy; by '+ photo.user.fullname +', '+ photo.created_at.substr(0, 10);
			me.ePhotoCategory.innerHTML = me.categories[photo.category];
			me.ePhotoDescription.innerHTML = photo.description;
			if(me.topImg.height) {
				me.backImg.src = photo.image_url;
				doc.show(me.backImg.parentNode);
				me.topImg.parentNode.style.opacity = 0;
				me.isTransition = true;
				if(me.isLoading) {
					doc.show(me.ePhotoLoader);
					me.isNeedResize = true;
				}
				else doc.el('desk').style.height = me.backImg.height +'px';

				me.timeoutId = setTimeout(me.onFadeEnd.bind(me), 1000);
			}
			else {
				me.topImg.src = photo.image_url;
				// cache the next img
				me.getNextPhoto(true);
				me.addThumbs(photo.image_url);
			}
			doc.el('details').href = 'http://500px.com/photo/'+ photo.id;

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
			// cache the next img
			this.getNextPhoto(true);
		},

		preloadPhoto: function(photo) {
			this.preloadImg.src = photo.image_url;
			this.isLoading = true;
		},

		addThumbs: function(photo) {
			var by = feature + (category || ''),
				thumbs = this.thumbs[by];

			if(!thumbs) {
				thumbs = [];
				this.thumbs[by] = thumbs;
			}
			thumbs.push(photo);
		}
	};

	window.onload = function() {
		app.init();
	};
})();
