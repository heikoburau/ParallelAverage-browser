Vue.component('job-item', {
  props: ["job", "args_filter", "kwargs_filter"],
  template: "#job-item-template",
  methods: {
    objects_equal: function(a, b) {
      return objects_equal(a, b);
    }
  }
})


var app = new Vue({
  el: '#app',
  data: {
    file: null,
    database: null,
    selected_function: "",
    args_filter: "",
    kwargs_filter: ""
  },
  computed: {
    cleaned_args_filter: function() {
      try {
        return JSON.parse(this.args_filter);
      } catch (e) {
        return [];
      }
    },
    cleaned_kwargs_filter: function() {
      try {
        return JSON.parse(this.kwargs_filter);
      } catch (e) {
        return {};
      }
    },
    kwargs_filter_is_valid: function() {
      return Object.keys(this.cleaned_kwargs_filter).length
    },
    args_filter_begin_edited: function() {
      return this.args_filter.length > 2 && !this.cleaned_args_filter.length
    },
    kwargs_filter_begin_edited: function() {
      return this.kwargs_filter.length > 2 && !this.kwargs_filter_is_valid
    },
    function_names: function() {
      if(this.database) {
        return new Set(this.database.map(job => job.function_name));
      } else {
        return [];
      }
    },
    visible_jobs: function() {
      if(!this.database) {
        return [];
      }
      var result = this.database;
      if(this.selected_function) {
        result = result.filter(job => job.function_name.includes(this.selected_function));
      }
      if(this.cleaned_args_filter) {
        result = result.filter(job => list_starts_with_other_list(job.args, this.cleaned_args_filter));
      }
      if(this.cleaned_kwargs_filter) {
        result = result.filter(job => object_contains_other_object(job.kwargs, this.cleaned_kwargs_filter));
      }

      return result;
    }
  },
  methods: {
    load_database: function() {
      var load_database_button = document.getElementById('file-input');
      load_database_button.click();
      load_database_button.onchange = (e) => {
        this.file = e.target.files[0];
        var reader = new FileReader();
        
        reader.onload = readerEvent => {
          var content = readerEvent.target.result; // this is the content!
          this.database = JSON.parse(content);
        }

        reader.readAsText(this.file, 'UTF-8');
      }
    },
    select_function: function(name) {
      if(name == this.selected_function) {
        this.selected_function = "";
        return;
      }
      this.selected_function = name;
    },
    toggle_arg: function(i, job_args) {
      try {
        args_filter_list = JSON.parse(this.args_filter);
      } catch(e) {
        args_filter_list = {}
      }

      if(this.cleaned_args_filter.length > i && objects_equal(this.cleaned_args_filter[i], job_args[i])) {
        args_filter_list = args_filter_list.slice(0, i);
        this.args_filter = JSON.stringify(args_filter_list);
        return;
      }

      this.args_filter = JSON.stringify(job_args.slice(0, i + 1));
    },
    toggle_kwarg: function(name, value) {
      if(this.kwargs_filter_begin_edited) {
        return;
      }

      try {
        kwargs_filter_obj = JSON.parse(this.kwargs_filter);
      } catch(e) {
        kwargs_filter_obj = {}
      }
      if(
        kwargs_filter_obj.hasOwnProperty(name) && 
        objects_equal(kwargs_filter_obj[name], value)
      ) {
        delete kwargs_filter_obj[name];
      } else {
        kwargs_filter_obj[name] = value;
      }

      this.kwargs_filter = JSON.stringify(kwargs_filter_obj);
    }
  },
})


function list_starts_with_other_list(a, b) {
  if(!Array.isArray(a) || !Array.isArray(b)) {
    return false;
  }
  if(b.length > a.length) {
    return false;
  }

  return objects_equal(a.slice(0, b.length), b);
}


function object_contains_other_object(a, b) {
  a_sub = {}
  for(attr in b) {
    if(a.hasOwnProperty(attr))  {
      a_sub[attr] = a[attr];
    } else {
      return false;
    }
  }

  return objects_equal(a_sub, b);
}


function objects_equal(a, b) {
  return JSON.stringify(a) == JSON.stringify(b);
}