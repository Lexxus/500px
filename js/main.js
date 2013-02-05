(function(doc){
	var cfg = {
			feature: 'popular',
			only: '',
			rpp: 20
		},
		timeoutId,
		phList = {}, phCats = {},
		ui, photo, cache = new Image(),
		categories = [
			'0=All',
			'10=Abstract',
			'11=Animals',
			'5=Black and White',
			'1=Celebrities',
			'9=City and Architecture',
			'15=Commercial',
			'16=Concert',
			'20=Family',
			'14=Fashion',
			'2=Film',
			'24=Fine Art',
			'23=Food',
			'3=Journalism',
			'8=Landscapes',
			'12=Macro',
			'18=Nature',
			'4=Nude',
			'7=People',
			'19=Performing Arts',
			'17=Sport',
			'6=Still Life',
			'21=Street',
			'26=Transportation',
			'13=Travel',
			'22=Underwater',
			'27=Urban Exploration',
			'25=Wedding'
		];

	window.onload = function(){
		var cats = doc.el('categories'),
			ulInnerHTML = '', href = '';

		_500px.init({
			sdk_key: '4d517cab76a6bf004a79e42057ee97006af42044'
		});

		for(var j = 0, c, cc; c = categories[j]; ++j){
			cc = c.split('=');
			if(cc[0] != '0'){
				href = cc[1].replace(/ /g, '-');
				phCats[cc[0]] = cc[1];
			}else{
				phCats[0] = 'Uncategorized';
			}
			ulInnerHTML += '<li><a href="#'+ href +'">'+ cc[1] +'</a></li>';
		}
		cats.innerHTML = ulInnerHTML;

		doc.elsByTag('a').on('click', function(e){
			if(this.href == '#') e.preventDefault();
		});
		// nav actions
		doc.el('features').elsByTag('a').on('click', function(e){
			if(timeoutId) clearTimeout(timeoutId);

			var freshTop = doc.el('freshTop'),
				f = this.href.split('#')[1];
			if(f){
				freshTop.innerText = 'Fresh';
				cfg.feature = f;
				doc.el('features').elsByTag('li').removeClass('active');
				this.parentNode.addClass('active');
				if(f.substr(0, 5) === 'fresh'){
					freshTop.innerText += ' '+ this.innerText;
					freshTop.parentNode.addClass('active');
				}
				getPhoto();
			}
			return false;
		});
		cats.elsByTag('a').on('click', function(e){
			if(timeoutId) clearTimeout(timeoutId);

			var v = this.href,
				cat = v.split('#')[1].replace(/-/g, ' ');
			cfg.only = cat;
			cats.elsByClass('active').removeClass('active');
			this.parentNode.addClass('active');
			var catEl = doc.el('categoryTop');
			catEl.innerText = cat;
			catEl.href = v;

			getPhoto();
			return false;
		});

		var btnUpdate = doc.el('btnUpdate'),
			btnPlay = doc.el('btnPlay'),
			BTN_PLAY_TEXT = btnPlay.textContent;

		ui = {
			img0: doc.el('photo1'),
			img1: doc.el('photo2'),
			name: doc.el('photoName'),
			owner: doc.el('photoOwner'),
			cat: doc.el('photoCategory'),
			descr: doc.el('photoDescr'),
			loader: doc.el('loader'),
			i: 0
		};
		for(var i = 0, n, p; i < 2; ++i){
			n = ui['img'+i];
			n.onload = showPhoto;
			p = n.parentNode;
			p.addEventListener('transitionend', showPhotoEnd, false);
			p.addEventListener('webkitTransitionEnd', showPhotoEnd, false);
			p.addEventListener('mozTransitionEnd', showPhotoEnd, false);
			p.addEventListener('msTransitionEnd', showPhotoEnd, false);
			p.addEventListener('oTransitionEnd', showPhotoEnd, false);
			p.style.zIndex = i;
		}

		ui.img = ui['img'+ui.i];

		getPhoto();

		btnUpdate.onclick = getPhoto;
		doc.el('desk').onclick = function(){
			if(!timeoutId) getPhoto();
		}
		btnPlay.onclick = function(){
			if(this.textContent == BTN_PLAY_TEXT){
				this.textContent = 'Stop';
				btnUpdate.disabled = true;

				//getPhoto();
				next(1);
			}else{
				clearTimeout(timeoutId);
				timeoutId = null;
				btnUpdate.disabled = false;
				this.textContent = BTN_PLAY_TEXT;
			}
		};
	};

	function next(timeout){
		timeoutId = setTimeout(function(){
			getPhoto();
		}, timeout != undefined ? timeout : 1000 * doc.el('photoDuration').value);
		console.log(timeoutId +': '+ (timeout != undefined ? timeout : 1000 * doc.el('photoDuration').value));
	};

	function getPhoto(toCache){
		var by = cfg.feature + cfg.only,
			list;

		if(!toCache) ui.loader.show();

		if(phList[by]){
			list = phList[by];
			if(list.cursor < list.photos.length){
				photo = list.photos[list.cursor++];
				ui.img.src = photo.image_url;
				// to cache next photo
				if(list.cursor < list.photos.length){
					cache.src = list.photos[list.cursor].image_url;
				}else{
					setTimeout(function(){
						getPhoto(true);
					}, 0);
				}
				return;
			}else{
				++list.page;
			}
		}else{
			phList[by] = { photos:[], page: 1, cursor: 0 };
		}

		var options = {
				feature: cfg.feature,
				image_size: 4,
				page: phList[by].page,
				rpp: cfg.rpp
			},
			photos;

		if(cfg.only){
			options.only = cfg.only;
		}

		_500px.api('/photos', options, function (response) {
			if (response.success) {
				var photos = response.data.photos, list, i;
				//console.log(photos);

				list = phList[by];

				if(photos.length == 0){
					list.cursor = 0;
				}else{
					// shuffle
					while(photos.length > 1){
						i = ~~(Math.random() * photos.length);
						list.photos.push(
							photos.splice(i, 1)[0]
						);
					}
					list.photos.push(photos[0]);
				}

				if(!toCache){
					photo = list.photos[list.cursor++];
					ui.img.src = photo.image_url;
				}
				cache.src = list.photos[list.cursor].image_url;
			} else {
				alert('Unable to complete request: ' + response.status + ' - ' + response.error_message);
			}
		});
	}

	function showPhoto(){
		ui.loader.hide();
		ui.name.innerHTML = photo.name;
		ui.owner.innerHTML = '&copy; by '+ photo.user.fullname +', '+ photo.created_at.substr(0, 10);
		ui.cat.innerHTML = phCats[photo.category];
		ui.descr.innerHTML = photo.description;
		ui.img.style.display = '';
		doc.el('desk').style.height = ui.img.height +'px';
		doc.el('details').href = 'http://500px.com/photo/'+ photo.id;

		var i = Math.abs(ui.i - 1),
			img2 = ui['img'+i];
		img2.parentNode.style.opacity = 0;

		if(timeoutId && !supportsTransitions()){
			next();
		}
	}

	function showPhotoEnd(){
		if(this.style.opacity == 1) return;

		ui.img.parentNode.style.zIndex = 1;

		ui.i = Math.abs(ui.i - 1);
		ui.img = ui['img'+ui.i];
		ui.img.style.display = 'none';
		this.style.zIndex = 0;
		this.style.opacity = 1;

		if(timeoutId) next();
	}

	function supportsTransitions() {
		var b = document.body || document.documentElement;
		var s = b.style;
		var p = 'transition';
		if(typeof s[p] == 'string') {return true; }

		// Tests for vendor specific prop
		v = ['Moz', 'Webkit', 'Khtml', 'O', 'ms'],
			p = p.charAt(0).toUpperCase() + p.substr(1);
		for(var i=0; i<v.length; i++) {
			if(typeof s[v[i] + p] == 'string') { return true; }
		}
		return false;
	}
}(document));