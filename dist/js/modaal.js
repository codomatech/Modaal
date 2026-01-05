/*!
	Modaal - accessible modals - v1.0.0 (Vanilla JS)
	Modern JavaScript version without jQuery
	by Humaan, for all humans.
	http://humaan.com
	adapted by Codoma.tech
	https://www.codoma.tech
 */

class Modaal {
	constructor(options = {}) {
		this.options = { ...Modaal.defaults, ...options };
		this.xhr = null;
		this.dom = document.body;
		this.lastFocus = null;

		this.scope = {
			is_open: false,
			id: 'modaal_' + Date.now() + Math.random().toString(16).substring(2),
			source: this.options.content_source
		};

		this.privateOptions = {
			active_class: 'is_active'
		};

		// Setup close button
		if (this.options.is_locked || this.options.type === 'confirm' || this.options.hide_close) {
			this.scope.close_btn = '';
		} else {
			this.scope.close_btn = `<button type="button" class="modaal-close" id="modaal-close" aria-label="${this.options.close_aria_label}"><span>${this.options.close_text}</span></button>`;
		}

		// Reset animation speed
		if (this.options.animation === 'none') {
			this.options.animation_speed = 0;
			this.options.after_callback_delay = 0;
		}

		// Setup gallery controls
		const modClass = this.options.outer_controls ? 'outer' : 'inner';
		this.scope.prev_btn = `<button type="button" class="modaal-gallery-control modaal-gallery-prev modaal-gallery-prev-${modClass}" id="modaal-gallery-prev" aria-label="Previous image (use left arrow to change)"><span>Previous Image</span></button>`;
		this.scope.next_btn = `<button type="button" class="modaal-gallery-control modaal-gallery-next modaal-gallery-next-${modClass}" id="modaal-gallery-next" aria-label="Next image (use right arrow to change)"><span>Next Image</span></button>`;

		// Auto-open if specified
		if (this.options.start_open) {
			this.open();
		}
	}

	open() {
		if (this.options.should_open === false ||
			(typeof this.options.should_open === 'function' && this.options.should_open() === false)) {
			return;
		}

		this.options.before_open.call(this);

		switch (this.options.type) {
			case 'inline':
				this.createBasic();
				break;
			case 'ajax':
				this.fetchAjax(this.options.source(null, this.scope.source));
				break;
			case 'confirm':
				this.options.is_locked = true;
				this.createConfirm();
				break;
			case 'image':
				this.createImage();
				break;
			case 'iframe':
				this.createIframe(this.options.source(null, this.scope.source));
				break;
			case 'video':
				this.createVideo(this.scope.source);
				break;
			case 'instagram':
				this.createInstagram();
				break;
		}

		this.watchEvents();
	}

	close() {
		const modalWrapper = document.getElementById(this.scope.id);
		if (!modalWrapper) return;

		this.options.before_close.call(this, modalWrapper);

		if (this.xhr) {
			this.xhr.abort();
			this.xhr = null;
		}

		if (this.options.animation === 'none') {
			modalWrapper.classList.add('modaal-start_none');
		} else if (this.options.animation === 'fade') {
			modalWrapper.classList.add('modaal-start_fade');
		} else if (this.options.animation === 'slide-down') {
			modalWrapper.classList.add('modaal-start_slide_down');
		}

		setTimeout(() => {
			if (this.options.type === 'inline') {
				// Only try to move content back if source is a selector string, not a function
				if (typeof this.scope.source === 'string') {
					const container = document.querySelector(`#${this.scope.id} .modaal-content-container`);
					const source = document.querySelector(this.scope.source);
					if (container && source) {
						while (container.firstChild) {
							source.appendChild(container.firstChild);
						}
					}
				}
				// If source was a function, we just discard the content on close
			}

			modalWrapper.remove();
			this.options.after_close.call(this);
			this.scope.is_open = false;
		}, this.options.after_callback_delay);

		this.modaalOverlay('hide');

		if (this.lastFocus) {
			this.lastFocus.focus();
		}
	}

	watchEvents() {
		this.dom.removeEventListener('click', this.clickHandler);
		this.dom.removeEventListener('keyup', this.keyupHandler);
		this.dom.removeEventListener('keydown', this.keydownHandler);

		this.keydownHandler = (e) => {
			if (e.keyCode === 9 && this.scope.is_open) {
				const modal = document.getElementById(this.scope.id);
				if (modal && !modal.contains(e.target)) {
					const focusable = modal.querySelector('[tabindex="0"]');
					if (focusable) focusable.focus();
				}
			}
		};

		this.keyupHandler = (e) => {
			if (e.shiftKey && e.keyCode === 9 && this.scope.is_open) {
				const modal = document.getElementById(this.scope.id);
				if (modal && !modal.contains(e.target)) {
					const closeBtn = modal.querySelector('.modaal-close');
					if (closeBtn) closeBtn.focus();
				}
			}

			if (!this.options.is_locked && e.keyCode === 27 && this.scope.is_open) {
				if (document.activeElement.matches('input:not([type="checkbox"]):not([type="radio"])')) {
					return;
				}
				this.close();
				return;
			}

			if (this.options.type === 'image') {
				const modal = document.getElementById(this.scope.id);
				if (e.keyCode === 37 && this.scope.is_open) {
					const prevBtn = modal?.querySelector('.modaal-gallery-prev');
					if (prevBtn && !prevBtn.classList.contains('is_hidden')) {
						this.galleryUpdate('prev');
					}
				}
				if (e.keyCode === 39 && this.scope.is_open) {
					const nextBtn = modal?.querySelector('.modaal-gallery-next');
					if (nextBtn && !nextBtn.classList.contains('is_hidden')) {
						this.galleryUpdate('next');
					}
				}
			}
		};

		this.clickHandler = (e) => {
			const target = e.target;

			if (!this.options.is_locked) {
				if ((this.options.overlay_close && target.classList.contains('modaal-inner-wrapper')) ||
					target.classList.contains('modaal-close') ||
					target.closest('.modaal-close')) {
					this.close();
					return;
				}
			}

			if (target.classList.contains('modaal-confirm-btn')) {
				if (target.classList.contains('modaal-ok')) {
					this.options.confirm_callback.call(this, this.lastFocus);
				}
				if (target.classList.contains('modaal-cancel')) {
					this.options.confirm_cancel_callback.call(this, this.lastFocus);
				}
				this.close();
				return;
			}

			if (target.classList.contains('modaal-gallery-control')) {
				if (target.classList.contains('is_hidden')) return;

				if (target.classList.contains('modaal-gallery-prev')) {
					this.galleryUpdate('prev');
				}
				if (target.classList.contains('modaal-gallery-next')) {
					this.galleryUpdate('next');
				}
			}
		};

		this.dom.addEventListener('keydown', this.keydownHandler);
		this.dom.addEventListener('keyup', this.keyupHandler);
		this.dom.addEventListener('click', this.clickHandler);
	}

	buildModal(content, isResolvedContent = false) {
		const igClass = this.options.type === 'instagram' ? ' modaal-instagram' : '';
		const wrapClass = this.options.type === 'video' ? 'modaal-video-wrap' : 'modaal-content';

		let animationClass = ' modaal-start_none';
		if (this.options.animation === 'fade') {
			animationClass = ' modaal-start_fade';
		} else if (this.options.animation === 'slide-down') {
			animationClass = ' modaal-start_slidedown';
		}

		const fullscreenClass = this.options.fullscreen ? ' modaal-fullscreen' : '';
		const customClass = this.options.custom_class ? ' ' + this.options.custom_class : '';

		let dimensionsStyle = '';
		if (this.options.width && this.options.height &&
			typeof this.options.width === 'number' && typeof this.options.height === 'number') {
			dimensionsStyle = ` style="max-width:${this.options.width}px;height:${this.options.height}px;overflow:auto;"`;
		} else if (this.options.width && typeof this.options.width === 'number') {
			dimensionsStyle = ` style="max-width:${this.options.width}px;"`;
		} else if (this.options.height && typeof this.options.height === 'number') {
			dimensionsStyle = ` style="height:${this.options.height}px;overflow:auto;"`;
		}

		if (['image', 'video', 'instagram'].includes(this.options.type) || this.options.fullscreen) {
			dimensionsStyle = '';
		}

		const touchTrigger = this.isTouch() ? ' style="cursor:pointer;"' : '';

		let markup = `<div class="modaal-wrapper modaal-${this.options.type}${animationClass}${igClass}${fullscreenClass}${customClass}" id="${this.scope.id}">
			<div class="modaal-outer-wrapper">
				<div class="modaal-inner-wrapper"${touchTrigger}>`;

		if (this.options.type !== 'video') {
			markup += `<div class="modaal-container"${dimensionsStyle}>`;
		}

		markup += `<div class="${wrapClass} modaal-focus" aria-hidden="false" aria-label="${this.options.accessible_title} - ${this.options.close_aria_label}" role="dialog">`;

		if (this.options.type === 'inline') {
			markup += '<div class="modaal-content-container" role="document"></div>';
		} else {
			markup += content;
		}

		markup += `</div>${this.scope.close_btn}`;

		if (this.options.type !== 'video') {
			markup += '</div>';
		}

		markup += '</div>';

		if (this.options.type === 'image' && this.options.outer_controls) {
			markup += this.scope.prev_btn + this.scope.next_btn;
		}

		markup += '</div></div>';

		if (!document.getElementById(this.scope.id + '_overlay')) {
			this.dom.insertAdjacentHTML('beforeend', markup);
		}

		if (this.options.type === 'inline') {
			const container = document.querySelector(`#${this.scope.id} .modaal-content-container`);

			if (isResolvedContent) {
				// Content is already resolved (from function or querySelector)
				if (typeof content === 'string') {
					container.innerHTML = content;
				} else if (content instanceof Element) {
					while (content.firstChild) {
						container.appendChild(content.firstChild);
					}
				}
			} else {
				// Original behavior: move content from source selector
				const source = document.querySelector(this.scope.source);
				if (source && container) {
					while (source.firstChild) {
						container.appendChild(source.firstChild);
					}
				}
			}
		}

		this.modaalOverlay('show');
	}

	createBasic() {
		let content = '';
		let isResolvedContent = false;

		// Check if content_source is a function
		if (typeof this.scope.source === 'function') {
			const result = this.scope.source();
			// If function returns a string, treat it as HTML
			if (typeof result === 'string') {
				const tempDiv = document.createElement('div');
				tempDiv.innerHTML = result;
				content = tempDiv;
			} else {
				// If it returns a DOM element, use it directly
				content = result;
			}
			isResolvedContent = true;
		} else {
			// Original behavior: selector string
			const target = document.querySelector(this.scope.source);
			if (target) {
				content = target;
			} else {
				content = 'Content could not be loaded. Please check the source and try again.';
			}
		}

		this.buildModal(content, isResolvedContent);
	}

	createConfirm() {
		const content = `<div class="modaal-content-container">
			<h1 id="modaal-title">${this.options.confirm_title}</h1>
			<div class="modaal-confirm-content">${this.options.confirm_content}</div>
			<div class="modaal-confirm-wrap">
				<button type="button" class="modaal-confirm-btn modaal-ok" aria-label="Confirm">${this.options.confirm_button_text}</button>
				<button type="button" class="modaal-confirm-btn modaal-cancel" aria-label="Cancel">${this.options.confirm_cancel_button_text}</button>
			</div>
		</div>`;

		this.buildModal(content);
	}

	createImage() {
		let content = '<div class="modaal-gallery-item is_active" aria-label="Image">Image content</div>';
		this.buildModal(content);
	}

	createVideo(url) {
		const content = `<iframe src="${url}" class="modaal-video-frame" frameborder="0" allowfullscreen></iframe>`;
		this.buildModal(`<div class="modaal-video-container">${content}</div>`);
	}

	createIframe(url) {
		let content;
		if (this.options.width && this.options.height) {
			content = `<iframe src="${url}" class="modaal-iframe-elem" frameborder="0" allowfullscreen></iframe>`;
		} else {
			content = '<div class="modaal-content-container">Please specify a width and height for your iframe</div>';
		}
		this.buildModal(content);
	}

	createInstagram() {
		const errorMsg = "Instagram photo couldn't be loaded, please check the embed code and try again.";
		this.buildModal(`<div class="modaal-content-container ${this.options.loading_class}">${this.options.loading_content}</div>`);

		// Instagram implementation would require their API
		const target = document.querySelector(`#${this.scope.id} .modaal-content-container`);
		if (target) {
			target.classList.remove(this.options.loading_class);
			target.classList.add(this.options.ajax_error_class);
			target.innerHTML = errorMsg;
		}
	}

	fetchAjax(url) {
		if (this.options.accessible_title === null) {
			this.options.accessible_title = 'Dialog Window';
		}

		if (this.xhr) {
			this.xhr.abort();
			this.xhr = null;
		}

		this.buildModal(`<div class="modaal-content-container ${this.options.loading_class}">${this.options.loading_content}</div>`);

		this.xhr = new XMLHttpRequest();
		this.xhr.open('GET', url, true);

		this.xhr.onload = () => {
			if (this.xhr.status >= 200 && this.xhr.status < 400) {
				const target = document.querySelector(`#${this.scope.id} .modaal-content-container`);
				if (target) {
					target.classList.remove(this.options.loading_class);
					target.innerHTML = this.xhr.responseText;
					this.options.ajax_success.call(this, target);
				}
			} else {
				this.handleAjaxError();
			}
		};

		this.xhr.onerror = () => this.handleAjaxError();
		this.xhr.send();
	}

	handleAjaxError() {
		const target = document.querySelector(`#${this.scope.id} .modaal-content-container`);
		if (target) {
			target.classList.remove(this.options.loading_class);
			target.classList.add(this.options.ajax_error_class);
			target.innerHTML = 'Content could not be loaded. Please check the source and try again.';
		}
	}

	galleryUpdate(direction) {
		// Simplified gallery update - full implementation would mirror jQuery version
		console.log('Gallery update:', direction);
	}

	modaalOpen() {
		const modalWrapper = document.getElementById(this.scope.id);
		if (!modalWrapper) return;

		if (this.options.animation === 'none') {
			modalWrapper.classList.remove('modaal-start_none');
			this.options.after_open.call(this, modalWrapper);
		} else if (this.options.animation === 'fade') {
			modalWrapper.classList.remove('modaal-start_fade');
		} else if (this.options.animation === 'slide-down') {
			modalWrapper.classList.remove('modaal-start_slidedown');
		}

		document.querySelectorAll('.modaal-wrapper *[tabindex="0"]').forEach(el => {
			el.removeAttribute('tabindex');
		});

		let focusTarget = modalWrapper.querySelector('.modaal-focus');

		if (this.options.type === 'image') {
			focusTarget = modalWrapper.querySelector(`.modaal-gallery-item.${this.privateOptions.active_class}`);
		} else if (modalWrapper.querySelector('.modaal-iframe-elem')) {
			focusTarget = modalWrapper.querySelector('.modaal-iframe-elem');
		} else if (modalWrapper.querySelector('.modaal-video-wrap')) {
			focusTarget = modalWrapper.querySelector('.modaal-video-wrap');
		}

		if (focusTarget) {
			focusTarget.setAttribute('tabindex', '0');
			focusTarget.focus();
		}

		if (this.options.animation !== 'none') {
			setTimeout(() => {
				this.options.after_open.call(this, modalWrapper);
			}, this.options.after_callback_delay);
		}
	}

	modaalOverlay(action) {
		if (action === 'show') {
			this.scope.is_open = true;

			if (!this.options.background_scroll) {
				this.dom.classList.add('modaal-noscroll');
			}

			if (!document.getElementById(this.scope.id + '_overlay')) {
				const overlay = document.createElement('div');
				overlay.className = 'modaal-overlay';
				overlay.id = this.scope.id + '_overlay';
				overlay.style.background = this.options.background;
				overlay.style.opacity = '0';
				this.dom.appendChild(overlay);

				// Trigger reflow
				overlay.offsetHeight;

				this.animateOpacity(overlay, 0, this.options.overlay_opacity, this.options.animation_speed, () => {
					this.modaalOpen();
				});
			}
		} else if (action === 'hide') {
			const overlay = document.getElementById(this.scope.id + '_overlay');
			if (overlay) {
				this.animateOpacity(overlay, parseFloat(overlay.style.opacity), 0, this.options.animation_speed, () => {
					overlay.remove();
					this.dom.classList.remove('modaal-noscroll');
				});
			}
		}
	}

	animateOpacity(element, from, to, duration, callback) {
		const start = performance.now();
		const animate = (currentTime) => {
			const elapsed = currentTime - start;
			const progress = Math.min(elapsed / duration, 1);
			element.style.opacity = from + (to - from) * progress;

			if (progress < 1) {
				requestAnimationFrame(animate);
			} else if (callback) {
				callback();
			}
		};
		requestAnimationFrame(animate);
	}

	isTouch() {
		return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
	}

	static defaults = {
		type: 'inline',
		content_source: null,
		animation: 'fade',
		animation_speed: 300,
		after_callback_delay: 350,
		is_locked: false,
		hide_close: false,
		background: '#000',
		overlay_opacity: 0.8,
		overlay_close: true,
		accessible_title: 'Dialog Window',
		start_open: false,
		fullscreen: false,
		custom_class: '',
		background_scroll: false,
		should_open: true,
		close_text: 'Close',
		close_aria_label: 'Close (Press escape to close)',
		width: null,
		height: null,
		before_open: function() {},
		after_open: function() {},
		before_close: function() {},
		after_close: function() {},
		source: function(element, src) { return src; },
		confirm_button_text: 'Confirm',
		confirm_cancel_button_text: 'Cancel',
		confirm_title: 'Confirm Title',
		confirm_content: '<p>This is the default confirm dialog content.</p>',
		confirm_callback: function() {},
		confirm_cancel_callback: function() {},
		gallery_active_class: 'gallery_active_item',
		outer_controls: false,
		before_image_change: function(current, incoming) {},
		after_image_change: function(current) {},
		loading_content: '<div class="modaal-loading-spinner"><div><div></div></div><div><div></div></div><div><div></div></div><div><div></div></div><div><div></div></div><div><div></div></div><div><div></div></div><div><div></div></div></div>',
		loading_class: 'is_loading',
		ajax_error_class: 'modaal-error',
		ajax_success: function() {},
		instagram_id: null
	};
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
	module.exports = Modaal;
}
if (typeof window !== 'undefined') {
	window.Modaal = Modaal;
}
