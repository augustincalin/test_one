( function( $ ) {
	
	// Initialisierung der scrollarea für Zerntrale Texte Absatz
	var registerSalScrollbar = function() {	
		mrm.mod.SalScrollbar = mrm.mod.Teaser01.extend( {
			on: function( callback ) {
				this._super(callback);
				this.initScrollings();
			},
			
	        onBroadcastWindowResize: function() {
	        	this.$sal_scrollPane &&	this.$sal_scrollPane.data('jsp').reinitialise();
	        },
			
			initScrollings: function() {			
				var $scrollarea = this.$( '.sal-scrollarea' );
				if($scrollarea.length > 0) {
					$scrollarea.css(
						{'max-height':'200px'}
					);
					this.$sal_scrollPane = $scrollarea.jScrollPane({
						verticalOffset: 2,
						contentWidth: '0px' // disables horizontal scrolling
					});
				}
			}
		} );
		
		mrm.mod.SalScrollbarProdukte = mrm.mod.SalScrollbar.extend({
			initScrollings: function() {			
				var $scrollarea = this.$( '.sal-scrollarea' );
				if($scrollarea.length > 0) {
					$scrollarea.css(
						{'height': window.innerWidth > 550 ? '128px' : '154px'}
					);
					this.$sal_scrollPane = $scrollarea.jScrollPane({
						verticalOffset: 2,
						maintainPosition: false,
						contentWidth: '0px' // disables horizontal scrolling
					});
				}
				
				var self = this;
				window['updateSalScrollbarProdukte'+this.$ctx.attr('id')] = function() {
					if (self.$sal_scrollPane) {
						var api = self.$sal_scrollPane.data('jsp');
						api.reinitialise();
					}
				};
			}
		});
	};
	// register SalScrollbar directly if mrm mods have already been loaded. else register after document.onload
	// registering only after onload does not work as the mrm mod's onload is bound earlier
	if (mrm.mod.Teaser01) {
		registerSalScrollbar();
	}
	else {
		jQuery(registerSalScrollbar);
	}
	
	
	
	// Salient Variante von mod-Plate: Hinzufügen DatePicker und Auswahl-Giddiness
	var registerSalPlate = function() {	
		mrm.mod.SalPlate = mrm.mod.Plate.extend( {
	
			
			init: function( $ctx, sandbox, modId ) {
				// call base constructor
				this._super( $ctx, sandbox, modId );
	
	
				$( 'input[type="text"].sal-date' ).datepicker( {
					dateFormat: window["lib_FormCenter_dateFormat"],
					showOtherMonths: true,
					beforeShow: function( input ) {
						$.datepicker._pos = $.datepicker._findPos( input ); //this is the default position
						$.datepicker._pos[ 0 ] += input.offsetWidth - 2; //left
						//$.datepicker._pos[1] += input.offsetHeight; //top
						
						// OnBlur auf Input-Feld überschreiben, damit durch den Verlust des Fokus durch den Datepicker
						// nicht ein Ajax-Request ausgelöst wird
						// Man könnte die alte Funktion irgendwie zwischenspeichern und beim onClose-Event unten
						// wieder einsetzen nach der Änderung durch die Datepicker-Komponente.
						// Funktioniert aber soweit alles, also lieber keine Experimente machen... :)
						this.onblur = function(){ 
							var desc = $('#'+this.id+'Desc');
							if(desc) {
								desc.hide(); // Eigentlich überfüssig - in Java ist festgelegt, dass bei Datepicker keine Description angezeigt wird
							}
						};
	
					},
					showOn: "button",
					// buttonImage: "images/sal-calendar.gif",
					// buttonImageOnly: true,
					onClose: function(dateText, inst) {
						// Manuell ein onChange-Event auslösen, damit ObserveField mitkriegt, dass sich der Inhalt geändert hat
						this.focus(); // Feld aktiv machen

						// Event auslösen
						if ("createEvent" in document) {
						    var evt = document.createEvent("HTMLEvents");
						    evt.initEvent("change", false, true);
						    this.dispatchEvent(evt);
						}
						else
							this.fireEvent("onchange");
							
					}
				} );
	
				// make sure the page is at least as high as the marginalspalte
				var marginal = $('.sal-marginal');
				if (marginal && marginal.length > 0) {
					var updateMarginalHeightFn = function() {
						$ctx.css('min-height', marginal.position().top + marginal.outerHeight());
					}
					
					updateMarginalHeightFn();
					
					var originalUpdateImageFn = mrm.util.adaptiveImage.updateImage;
					mrm.util.adaptiveImage.updateImage = function(id, index) {
						// appends img to #id
						originalUpdateImageFn.apply(this, arguments);
						
						var img = jQuery('#' + id + ' img');
						img.on('load', updateMarginalHeightFn);
					}
				}
			},
			
			initElements: function() {
				this.initStyledAuswahlfeld();
				
				this._super();
			},
			
			initStyledAuswahlfeld: function() {
	
				var $selects = this.$( 'div.input > .sal-auswahl-search > select' ).not('.select2-offscreen');
				if( $selects.length ) {
					$selects.select2( {
						minimumResultsForSearch: 12,
					    placeholder: window["lib_FormCenter_pleaseSelect"],
					    formatNoMatches: function () { return window["lib_FormCenter_noMatchesFound"]; },
					    dropdownCssClass: 'sal-openforms'
					} )
					.on("change", 
						function(e) {
							if (document.getElementById(this.id+'UCId') != null) {
								ASB.partial(this.id+'UCId', this.id, null);
							}
						}
					).on("select2-blur", 
						function(e) { 
							if (document.getElementById(this.id+'UCId') != null) {
								ASB.partial(this.id+'UCId', this.id, null);
							}
						}
					);
				}
				
				$selects = this.$( 'div.input > .sal-auswahl > select' ).not('.select2-offscreen');
				if( $selects.length ) {
					$selects.select2( {
						minimumResultsForSearch: -1,
					    placeholder: window["lib_FormCenter_pleaseSelect"],
					} )
					.on("change", 
						function(e) {
							if (document.getElementById(this.id+'UCId') != null) {
								ASB.partial(this.id+'UCId', this.id, null);
							}
						}
					).on("select2-blur", 
						function(e) { 
							if (document.getElementById(this.id+'UCId') != null) {
								ASB.partial(this.id+'UCId', this.id, null);
							}
						}
					);
				}
	
			},
	
		} );
	};
	if (mrm.mod.Plate) {
		registerSalPlate();
	}
	else {
		jQuery(registerSalPlate);
	}
		
		
	// sal-Akkordeon
	$(function(){
		
		function initAkkordeon(i, element) {
			$('.sal-akkordeon-headline', element).on('click', function(){
				$(element).toggleClass('sal-akkordeon-open');
				$('.sal-akkordeon-content', element).toggle();
			});
		}
		
		$('.sal-akkordeon').each(initAkkordeon);
		
	});
	
	// focus first errournous field
	var errorContainer = $('.sal-openforms .sal-panelform .error').filter(':visible:first');
	if (!errorContainer.is('.form-row')) {
		var formRow = errorContainer.parents('.form-row');
		if (formRow.length === 1) {
			errorContainer = formRow;
		}
	}
	//console.log('scroll to', errorContainer.length, errorContainer);
	
	if (errorContainer.length === 1) {
		
		var scrollTarget = (errorContainer.offset().top - (window.innerHeight / 3));
		
		$('html, body').animate({ scrollTop: scrollTarget}, 0, function(){
			if (errorContainer.find('.sal-fieldset').length > 0) {
				errorContainer.find('input.error').first().focus();
			}
			else {
				errorContainer.find('input').first().focus();
			}
		});
	}
	
} )( jQuery );