/*
 * jQuery Fancy Select is inspired by juery.tokeninput but changes some of the short comings of this plugin
 *
 */

(function($){
	$.fn.fancyInput = function(url,options){
		var time = new Date();
		
		var defaults = {
			cache: true,
			multiSelect: true,
			delay: 700,
			timeout: 200,
			filter: null,
			type: 'GET',
			paramName: 'q',
			dataType: 'json',
			noResults: 'No results',
			searching: 'Searching ...',
			multiSelectOff: 'This is a single select field',
			replacementId: time.getTime(),
			onReady: null,
			onDelete: null,
			callData: null,
			prepopulateData: null,
			classes: {}
		};
		
		var classes = {
			item: 'item',
			removeItem: 'b-del',
			replacement: 'replacement',
			field: 'field',
			selected: 'selected',
			lastSelected: 'last-selected',
			selectedItem: 'selected-item',
			notifier: 'notifier',
			results: 'results',
			hoverItem: 'item-hover',
			query: 'query'
		};
		
		var settings = $.extend(defaults,options);
		var objClasses = $.extend(classes,settings.classes);
		settings.classes = objClasses;
		settings.url = url;
		return this.each(function(){
			settings.replacementId = $(this).attr('id') + settings.replacementId;
			fancyInput(this,settings);
		});
	};
	
	function fancyInput(input, options){
		// Keys "enum"
    var KEY = {
        BACKSPACE: 8,
        TAB: 9,
        RETURN: 13,
        ESC: 27,
        LEFT: 37,
        UP: 38,
        RIGHT: 39,
        DOWN: 40,
        COMMA: 188
    };
		var fancyInputDivID = '#'+options.replacementId;
		var classes = options.classes;
		var replay = null;
		var Templates = {
			base: function(options,originalInputId,originalInputName){
				return '<div id="'+options.replacementId+'" class="'+classes.replacement+'"><input id="'+originalInputId+'" type="hidden" class="'+classes.field+'" name="'+originalInputName+'" value="" /><ul class="'+classes.selected+'"></ul><input class="'+classes.query+'" type="text" value="" /><p class="'+classes.notifier+'" style="display: none;"></p><ul class="'+classes.results+'" style="display: none;"></ul></div>';
			},
			item: function(obj){
				return $('<li class="'+classes.item+'">'+obj.name+'</li>').data('obj',obj);
			},
			selectedItem: function(obj){
				return $('<li class="'+classes.selectedItem+'"><p>'+obj.name+'</p><span class="'+classes.removeItem+'">x</span></li>').data('obj',obj);
			}
		};
		
		hide_input(input);
		setup_events();
		if (options.prepopulateData != null) { prepopulate(options.prepopulateData);};
		if (options.onReady != null) { options.onReady(); };
		
		function prepopulate(data){
			if (data.length < 1) { return false;};
			if (data[0] == null ) { return false;};
			var temp = [];
			var ele = $('.'+classes.selected, fancyInputDivID);
			for(i in data){
				temp.push(data[i].id);
				Templates.selectedItem(data[i]).appendTo(ele);
				if (!options.multiSelect) { 
					$('.'+classes.selected ,fancyInputDivID).addClass(classes.lastSelected);
					$(':input:last', fancyInputDivID).hide(); 
					break; 
				}
			}
			$(':input:first', fancyInputDivID).val(temp.join(','));
			return false;
		};
		
		function is_printable_character(keycode) {
			if((keycode >= 48 && keycode <= 90) ||      // 0-1a-z
				(keycode >= 96 && keycode <= 111) ||     // numpad 0-9 + - / * .
				(keycode >= 186 && keycode <= 192) ||    // ; = , - . / ^
				(keycode >= 219 && keycode <= 222)       // ( \ ) '
			) {
				return true;
			} else {
				return false;
			}
    };
		
		function hide_input(input){
			$(input).after(Templates.base(options,$(input).attr('id'), $(input).attr('name')));
			// $(input).remove();
			$(input).hide();
			$(input).attr('disabled','disabled');
			return false;
		};

		function keys (event) {
			switch(event.keyCode) {
				case KEY.LEFT:
				case KEY.UP:
					// directional pad handler
					// $(':input:last',	fancyInputDivID).trigger('up');
				break;
				case KEY.RIGHT:
				case KEY.DOWN:
					// directional pad handler
					// $(':input:last',	fancyInputDivID).trigger('down');
				break;
				case KEY.BACKSPACE:
					// remove last selected item
					replay = setTimeout(function(){ external_call($(':input:last',	fancyInputDivID).val(), options); },700);
				break;
				case KEY.TAB:
				case KEY.RETURN:
				case KEY.COMMA:
					// add current selected item form result list to selected items list
					// $(':input:last',	fancyInputDivID).trigger('add-item');
					event.stopPropagation();
					event.stopImmediatePropagation();
					event.preventDefault();
					return false;
				break;

				case KEY.ESC:
					// hide results list
					// $('.'+classes.results, fancyInputDivID).hide();
				default:
				if (is_printable_character(event.keyCode)) {
					replay = setTimeout(function(){ 
							search({immediate:true, query: $(':input:last',	fancyInputDivID).val()});
						 },700);
				};
				break;
			}
						
			return false;
		};
		
		function setup_events(){
			$(':input:last',	fancyInputDivID).bind({
				search: function(){ search({immediate:false}); },
				click: function(){ search({immediate:true}); },
				keyup: keys
			});
					
			$('.'+classes.item,	fancyInputDivID)
				.live('click', selectItem)
				.live('mouseenter', overIn)
				.live('mouseleave', overOut);
			
			$('.'+classes.removeItem,	fancyInputDivID).live('click', removeItem);
			
			$(fancyInputDivID).mouseleave(hideAll);
			
			return false;
		};
		
		function overIn(){ $(this).addClass(classes.hoverItem); };
		function overOut(){ $(this).removeClass(classes.hoverItem); };
		
		function search(params){
			var query = $(this).val();
			if (params.query != null) { query = params.query; };
			if (options.cache) {
				var data = cache({key: query}); 
				if (data != null) {
					showResults(data);
				}else{
					if (params.immediate) {
						external_call(query,options);
					}else{
						replay = setTimeout(function(){ external_call(query,options); }, options.delay);
					};
				}; 
			}
			else{
				if (params.immediate) {
					external_call(query,options);
				}else{
					replay = setTimeout(function(){ external_call(query,options); }, options.delay);
				};
			};
			return false;
		};
		
		function external_call(query,options){
			var current_query = $(':input:last', fancyInputDivID).val();
			if (query != current_query) {return false;};
			clearTimeout(replay);
			var data = options.paramName + '=';
			if (options.callData != null) {
				data += options.callData();
			}else{
				data += $(':input:last', fancyInputDivID).val();
			};
			if ( $(fancyInputDivID).data('lock') == null || $(fancyInputDivID).data('lock') == 'undefined' ) {
				$.ajax({
					url: options.url,
					type: options.type,
					data: data,
					dataType: options.dataType,
					beforeSend: function(){ 
						reset();
						notify(options.searching);
						$(fancyInputDivID).data('lock',true);
					},
					success: function(data) { 
						if (options.cache) { cache({key: query, value:data}); };
						showResults(data);
					},
					error: function(xhr,msg) { notify(options.noResults); },
					complete: function(){ $(fancyInputDivID).data('lock',null);}
				});
			};
			
			return false;
		};
		
		function hideAll(){
			notify(null);
			$('.'+classes.results, fancyInputDivID).hide();
			return false;
		}
		
		function notify(msg){
			$('.'+classes.notifier, fancyInputDivID).width($(fancyInputDivID).width() - 1);
			if (msg != null) {
				$('.'+classes.notifier, fancyInputDivID).text(msg);
				$('.'+classes.notifier, fancyInputDivID).show();
			}else{
				$('.'+classes.notifier, fancyInputDivID).hide();
			};
			return false;
		};
		
		function showResults(data){
			reset();
			$('.'+classes.results, fancyInputDivID).width($(fancyInputDivID).width() - 1);
			if (data.length < 1) {
				notify(options.noResults);
			}else{
				notify(null);
				if (options.filter != null) { data = options.filter(data); };
				$.each(data, function(i){
					var ele = $('.'+classes.results, fancyInputDivID);
					Templates.item(data[i]).appendTo(ele);
				});
				$('.'+classes.results, fancyInputDivID).show();
			}
		};
		
		function reset(){
			$('.'+classes.results, fancyInputDivID).hide();
			$('.'+classes.results, fancyInputDivID).empty();
		};
		
		function cache(options){
			if (options.value != null) {
				$(fancyInputDivID).data('cache_'+options.key,options.value);
			}else{
				return $(fancyInputDivID).data('cache_'+options.key);
			};
			return true;
		};
		
		function selectItem(){
			function add_one(){
				temp.push(item.data('obj').id);
				$(':input:first', fancyInputDivID).val(temp.join(','));
				var ele = $('.'+classes.selected, fancyInputDivID);
				Templates.selectedItem(item.data('obj')).appendTo(ele);
				item.remove();
				if (!options.multiSelect && temp.length == 1){
					$('.'+classes.results, fancyInputDivID).hide();
				}
				$('.'+classes.query , fancyInputDivID).val('');
			};
			
			var item = $(this);
			var current_value = $(':input:first', fancyInputDivID).val();
			var temp = null;
			if (current_value == '') { temp = []; }else{ temp = current_value.split(',');};
			if (options.multiSelect) {
				add_one();
			}else if (temp.length < 1){
				add_one();
				$('.'+classes.selected ,fancyInputDivID).addClass(classes.lastSelected);
				$(':input:last', fancyInputDivID).hide();
			}else{
				notify(options.multiSelectOff);
			};
			return false;
		};
		
		function removeItem(){
			var item = $(this).parents('.'+classes.selectedItem);
			var current_value = $(':input:first', fancyInputDivID).val();
			var temp = current_value.split(',');
			var index_of_item_to_remove = null;
			for (index in temp) { if (temp[index] == item.data('obj').id) { index_of_item_to_remove = index; };}
			temp.splice(index_of_item_to_remove,1);
			$(':input:first', fancyInputDivID).val(temp.join(','));
			var ele = $('.'+classes.results, fancyInputDivID);
			Templates.item(item.data('obj')).appendTo(ele);
			item.remove();
			$('.'+classes.selected ,fancyInputDivID).removeClass(classes.lastSelected);
			$(':input:last', fancyInputDivID).show();
			if (options.onDelete != null) { options.onDelete(); };
			return false;
		};
	};
})(jQuery);
