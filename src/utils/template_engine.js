const Handlebars = require('handlebars')
var fs = require('fs')

class TemplateEngine {
    resolveTemplate(template_name, vars) {
        var template_text = fs.readFileSync(`${__dirname}/../../templates/${template_name}.template`, 'utf-8')

        var template = Handlebars.compile(template_text);
        // execute the compiled template and print the output to the console
        return template(vars)
    }
}

module.exports = TemplateEngine