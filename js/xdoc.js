(function(d){
	d.el = d.getElementById;
	d.elById = d.el;
	d.elsByClass = d.getElementsByClassName;
	d.elsByTag = d.getElementsByTagName;
	d.query = d.querySelectorAll;

	var elP = Element.prototype,
		nlP = NodeList.prototype,
		hcP = HTMLCollection.prototype;

	elP.elsByClass = elP.getElementsByClassName;
	elP.elsByTag = elP.getElementsByTagName;
	elP.query = elP.querySelectorAll;

	elP.on = function(eventName, selector, handler){
		if(!eventName || !selector) return;

		if(typeof selector === 'function'){
			this.addEventListener(eventName, selector, false);
		}else if(typeof selector === 'string' || typeof handler === 'function'){
			this.query(selector).on(eventName, handler);
			return;
		}
	}

	elP.hide = function(){
		this.style.display = 'none';
	}
	elP.show = function(){
		this.style.display = 'block';
	}

	elP.addClass = function(className){
		this.classList.add(className);
	}
	elP.removeClass = function(className){
		this.classList.remove(className);
	}

	elP.html = function(html){
		if(html){
			this.innerHTML = html;
		}else{
			return this.innerHTML;
		}
	}

	nlP.on = multiAction('on');
	nlP.hide = multiAction('hide');
	nlP.show = multiAction('show');
	nlP.addClass = multiAction('addClass');
	nlP.removeClass = multiAction('removeClass');

	hcP.on = multiAction('on');
	hcP.hide = multiAction('hide');
	hcP.show = multiAction('show');
	hcP.addClass = multiAction('addClass');
	hcP.removeClass = multiAction('removeClass');

	if(typeof window.$ === 'undefined'){
		window.$ = function(q, el){
			if(!q) return;
			if(!el) el = d;
			var qq = q.split(' ');
			if(qq.length == 1 && q.indexOf('[') < 0){
				switch(q[0]){
					case '#':
						return el.el(q.substr(1));
					case '.':
						return el.elsByClass(q.substr(1));
					default:
						return el.elsByTag(q);
				}
			}else{
				return el.query(q);
			}
		}
	}

	function multiAction(action){
		return function(p1, p2){
			for(var i = 0, el; el = this[i]; ++i){
				el[action](p1, p2);
			}
		}
	}
}(document));