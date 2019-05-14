Vue.component('job-item', {
  props: ["job", "args_filter", "kwargs_filter_str"],
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
    rendered_args_filter: function() {
      return this.args_filter.split(",").map(
        el => ["*", "[*", "*]", "[*]"].includes(el.trim()) ? el.replace("*", `"${symbol_any}"`) : el
      ).join(",");
    },
    cleaned_args_filter: function() {
      try {
        return JSON.parse(this.rendered_args_filter);
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
    kwargs_filter_str: function() {
      return stringify_object(this.cleaned_kwargs_filter);
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
    function_name_matching_jobs: function() {
      if(!this.database) {
        return [];
      }
      var result = this.database;
      if(this.selected_function) {
        result = result.filter(job => job.function_name.includes(this.selected_function));
      }

      return result;
    },
    function_names_count: function() {
      var result = {};
      const prefiltered_jobs = this.filter_jobs(
        undefined, this.cleaned_args_filter, this.cleaned_kwargs_filter
      );
      this.function_names.forEach(name => {
        result[name] = prefiltered_jobs.filter(job => job.job_name.includes(name)).length;
      });
      return result;
    },
    visible_jobs: function() {
      return this.filter_jobs(this.selected_function, this.cleaned_args_filter, this.cleaned_kwargs_filter);
    },
    all_kwargs_values_str: function() {
      var result = {};
      for(const name in this.kwargs_filter_str) {
        result[name] = Array.from(new Set(this.function_name_matching_jobs.filter(
          job => job.kwargs.hasOwnProperty(name)
        ).map(
          job => job.kwargs_str[name]
        ))).sort();
      }
      return result;
    },
    all_kwargs_value_counts: function() {
      var result = {};
      for(const name in this.all_kwargs_values_str) {
        result[name] = {};
        this.all_kwargs_values_str[name].forEach(value_str => {
          const prefiltered_jobs = this.filter_jobs(
            this.selected_function, 
            this.cleaned_args_filter, 
            remove_key_from_object(name, this.cleaned_kwargs_filter)
          );
          result[name][value_str] = prefiltered_jobs.filter(
            job => job.kwargs.hasOwnProperty(name) && job.kwargs_str[name] == value_str
          ).length
        });
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
          this.database.forEach(job => {
            job.kwargs_str = stringify_object(job.kwargs);
          });
        };

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
    update_args_filter: function(arr) {
      this.args_filter = JSON.stringify(arr).replace(`"${symbol_any}"`, "*");
    },
    clear_arg: function(position) {
      if(position == this.cleaned_args_filter.length - 1) {
        this.cleaned_args_filter.pop();
      } else {
        this.cleaned_args_filter[position] = symbol_any;
      }
      this.update_args_filter(this.cleaned_args_filter);
    },
    set_arg: function(position, value) {
      if(position >= this.cleaned_args_filter.length) {
        this.update_args_filter(
          [].concat(this.cleaned_args_filter, new Array(position - this.cleaned_args_filter.length).fill(symbol_any), [value])
        );
      } else {
        this.cleaned_args_filter[position] = value;
        this.update_args_filter(this.cleaned_args_filter);
      }
    },
    toggle_arg: function(i, job_args) {
      if(i < this.cleaned_args_filter.length && objects_equal(this.cleaned_args_filter[i], job_args[i])) {
        this.clear_arg(i);
      } else {
        this.set_arg(i, job_args[i]);
      }
    },
    toggle_kwarg: function(name, value_str) {
      if(this.kwargs_filter_begin_edited) {
        return;
      }

      if(
        this.kwargs_filter_str.hasOwnProperty(name) && 
        this.kwargs_filter_str[name] == value_str
      ) {
        delete this.cleaned_kwargs_filter[name];
      } else {
        this.cleaned_kwargs_filter[name] = JSON.parse(value_str);
      }

      this.kwargs_filter = JSON.stringify(this.cleaned_kwargs_filter);
    },
    filter_jobs: function (function_name, args_filter, kwargs_filter) {
      if(!this.database) {
        return [];
      }
      var result = this.database;
      if(function_name) {
        result = result.filter(job => job.function_name.includes(function_name));
      }
      if(args_filter) {
        result = result.filter(job => array_starts_with_other_array(job.args, args_filter));
      }
      if(kwargs_filter) {
        result = result.filter(job => object_contains_other_object(job.kwargs, kwargs_filter));
      }

      return result;
    }
  },
})


function array_starts_with_other_array(a, b) {
  if(!Array.isArray(a) || !Array.isArray(b)) {
    return false;
  }
  if(b.length > a.length) {
    return false;
  }

  for(var i = 0; i < b.length; i++) {
    if(b[i] == symbol_any) {
      continue;
    }
    if(!objects_equal(a[i], b[i])) {
      return false;
    }
  }
  return true;
}


function object_contains_other_object(a, b) {
  var a_sub = {}
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


function stringify_object(obj) {
  var result = {};
  for(const name in obj) {
    result[name] = JSON.stringify(obj[name]);
  }
  return result;
}


function remove_key_from_object(key, obj) {
  var result = {};
  for(const name in obj) {
    if(name != key) {
      result[name] = obj[name];
    }
  }
  return result;
}


symbol_any = "#_any_#"
