var App = Ember.Application.create();

App.Router.map(function() {
    this.resource('add', { path: '/' });
    this.resource('view', { path: '/view/:contact_id' });
    this.resource('edit', { path: '/edit/:contact_id' });
});


// App Objects

App.Contact = Em.Object.extend({
    name: '',
    phone: '',
    email: ''
});

App.Contacts = Em.A([
    App.Contact.create({
        id: 1,
        name: 'First Contact',
        email: 'someone@someplace.com',
        phone: '1234567890'
    })
]);

App.ContactList = Em.ArrayProxy.extend(Em.SortableMixin, {

    contacts : Em.computed.alias('content'),

    sortProperties: ['name'],

    sortAscending: true,

    grouped : function() {
        var contacts = this.get('contacts');
        var groups = Em.A([]);
        var group;

        contacts.forEach(function(contact) {
            var lastGroup = groups.get('lastObject');
            if (!lastGroup || lastGroup.get('name') !== contact.get('firstLetterOfName')) {
                group = App.ContactGroup.create({ contacts: Em.A([]) });
                groups.addObject(group);
            }
            group.get('contacts').addObject(contact);
        });
        return groups;
    }.property('contacts.[]')
});

App.ContactGroup = Em.Object.extend({
    name : function() {
        return this.get('contacts.firstObject.name').substr(0, 1).toUpperCase();
    }.property('contacts.firstObject.name')
});

var initialContacts = App.ContactList.create({
    content: App.Contacts
});


// Routes

App.ApplicationRoute = Em.Route.extend({
    model : function() {
        return initialContacts;
    }
});

App.AddRoute = Em.Route.extend({
    model : function() {
        return App.Contact.create();
    }
});

App.ContactRouteMixin = Em.Mixin.create({
    model: function(params) {
        return App.Contacts.findProperty('id', +params.contact_id);
    }
});

App.ViewRoute = Em.Route.extend(App.ContactRouteMixin);

App.EditRoute = Em.Route.extend(App.ContactRouteMixin);


// Controllers

App.ApplicationController = Em.Controller.extend({

    contacts : Em.computed.alias('model.contacts'),

    searchCriteria : '',

    shouldShowSearchResults : Em.computed.gt('searchResults.length', 0),

    shouldShowNotFound : function() {
        return this.get('searchCriteria').length > 2 && !this.get('shouldShowSearchResults');
    }.property('searchCriteria', 'shouldShowSearchResults'),

    searchResults : function() {
        var searchCriteria = this.get('searchCriteria');
        if (!searchCriteria) {
            return Em.A([]);
        }

        var startsWithSearchCriteria = new RegExp('^' + searchCriteria, 'i');

        var contacts = this.get('contacts');
        var filteredContacts = contacts.filter(function(contact) {
            var name = contact.get('name');
            if (!name) {
                return false;
            }
            var names = name.split(' ');
            for (var i = 0; i < names.length; i++) {
                if (startsWithSearchCriteria.test(names[i])) {
                    return true;
                }
            }
            return false;
        }.bind(this));

        return filteredContacts;
    }.property('searchCriteria'),

    addContact : function(contact) {
        var contacts = this.get('contacts');

        contacts.addObject(contact);
        contact.set('id', contacts.length);
        this.transitionTo('view', contact);
    },

    editContact : function(contact) {
        var oldContact = this.get('contacts').findProperty('id', contact.get('id'));
        oldContact.setProperties(contact.getProperties('name', 'phone', 'email'));
        this.transitionTo('view', contact);
    },

    deleteContact : function(contact) {
        var contacts = this.get('contacts');
        this.set('contacts', contacts.rejectProperty('id', contact.get('id')));
        this.transitionTo('add');
    }

});

App.ContactFields = Em.Mixin.create({
    isNameValid: function() {
        return this.get('namePat').test(this.get('model.name'));
    }.property('model.name'),

    namePat: /^[a-z -]+$/i,

    isPhoneValid: function() {
        return this.get('phonePat').test(this.get('model.phone'));
    }.property('model.phone'),

    phonePat: /^[+0-9\(\)\.x# ]*$/,

    isEmailValid: function() {
        var email = this.get('model.email');
        if (!email.length) {
            return true;
        }
        return this.get('emailPat').test(email);
    }.property('model.email'),

    emailPat: /^[^@]+@[^\.@]+\.[^@]+$/,

    isFormValid: Em.computed.and('isNameValid', 'isPhoneValid', 'isEmailValid'),

    isFormInvalid: Em.computed.not('isFormValid'),
});

App.AddController = Em.Controller.extend(App.ContactFields, {

    needs : ['application'],

    addContact : function(contact) {
        this.get('controllers.application').send('addContact', contact);
    }

});

App.ViewController = Em.Controller.extend({
    goBack: function() {
        window.history.back();
    }
});

App.EditController = Em.Controller.extend(App.ContactFields, {

    needs: ['application'],

    editContact : function(contact) {
        this.get('controllers.application').send('editContact', contact);
    },

    deleteContact : function(contact) {
        this.get('controllers.application').send('deleteContact', contact);
    }
});
