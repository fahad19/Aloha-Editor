/**
 * Defines a `Container` Class.
 *
 * Containers are activated based on the `showOn` setting for the container.
 * The values are normalized to functions which accept an element and return a
 * boolean; true means the container should be shown.
 *
 * For efficiency, we group all containers that have the same normalized
 * `showOn()' function together, so we can evaluate it once, regardless of how
 * many containers are using the same logic. In order for this to work, the
 * exact same function must be returned from `Container.normalizeShowOn()' when
 * the logic is the same.
 *
 * The list of containers is then stored on the editable instance as
 * `editable.containers', which is a hash of `showOn()' ids to an array of
 * containers. The `showOn()' ids are unique identifiers that are stored as
 * properties of the `showOn()' function (see `getShowOnId()'). This gives us
 * constant lookup times when grouping containers.
 */

define([
	'jquery',
	'util/class',
	'ui/scopes',
	'PubSub'
], function(
	jQuery,
	Class,
	Scopes,
	PubSub
) {
	'use strict';

	var uid = 0;

	/**
	 * Gets the id of a normalized showOn option.  If the given function has
	 * not had its showOnId set it will receive one, the first time this
	 * function it is passed to this function.
	 *
	 * @param {function} showOn The function whose id we wish to get.
	 * @return {number} The id of the given function.
	 */
	function getShowOnId(showOn) {
		// Store a unique id on the showOn function.
		// See full explanation at top of file.
		if (!showOn.showOnId) {
			showOn.showOnId = ++uid;
		}
		return showOn.showOnId;
	}

	/**
	 * Show or hide a set of containers.
	 *
	 * @param {Array.<Container>} containers The set of containers to operate
	 *                                       on.
	 * @param {boolean} show Whether to show or hide the given containers.
	 */
	function toggleContainers(containers, show) {
		var action = show ? 'show' : 'hide';
		var j = containers.length;
		while (j) {
			containers[--j][action]();
		}
	}

	var scopeFns = {};

	var returnTrue = function() {
		return true;
	};

	/**
	 * Normalizes a showOn option into a function.
	 *
	 * @param {(string|boolean|function)} showOn
	 * @return function
	 */
	function normalizeShowOn(container, showOn) {
		switch( jQuery.type( showOn ) ) {
		case 'function':
			return showOn;
		case 'object':
			if (showOn.scope) {
				if (scopeFns[showOn.scope]) {
					return scopeFns[showOn.scope];
				}
				return scopeFns[showOn.scope] = function() {
					return Scopes.isActiveScope(showOn.scope);
				};
			} else {
				throw "Invalid showOn configuration";
			}
		default:
			return returnTrue;
		}
	}

	/**
	 * Container class.
	 *
	 * @class
	 * @base
	 */
	var Container = Class.extend({

		/**
		 * The containing (wrapper) element for this container.
		 *
		 * @type {jQuery<HTMLElement>}
		 */
		element: null,

		/**
		 * Initialize a new container with the specified properties.
		 *
		 * @param {object=} settings Optional properties, and override methods.
		 * @constructor
		 */
		_constructor: function( settings ) {
			var editable = this.editable = settings.editable;

			if (!editable.containers) {
				editable.containers = [];
			}

			var showOn = normalizeShowOn(this, settings.showOn);
			var key = getShowOnId(showOn);
			var group = editable.containers[key];
			if (!group) {
				group = editable.containers[key] = {
					shouldShow: showOn,
					containers: []
				};
			}
			group.containers.push(this);
		},

		// must be implemented by extending classes
		show: function() {},
		hide: function() {}
	});

	// static fields

	jQuery.extend( Container, {
		/**
		 * Given an array of elements, show appropriate containers.
		 *
		 * @param {object} editable Active editable
		 * @param {string} eventType Type of the event triggered (optional)
		 * @static
		 */
		showContainersForContext: function(editable, eventType) {
			var group,
			    groupKey,
			    containerGroups;
			if (!editable.containers) {
				// No containers were constructed for the given editable, so
				// there is nothing for us to do.
				return;
			}
			containerGroups = editable.containers;
			for (groupKey in containerGroups) {
				if (containerGroups.hasOwnProperty(groupKey)) {
					group = containerGroups[groupKey];
					toggleContainers(group.containers, group.shouldShow(eventType));
				}
			}
		}
	});

	PubSub.sub('aloha.ui.scope.change', function(){
		if (Aloha.activeEditable) {
			Container.showContainersForContext(Aloha.activeEditable, null);
		}
	});

	return Container;
});