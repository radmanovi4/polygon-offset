COMPILED = dist/offset.min.js
QS       = compilation_level=ADVANCED_OPTIMIZATIONS&output_format=text
URL      = http://closure-compiler.appspot.com/compile

all: clean sources compile

clean:
	@rm -rf dist/*

dist/offset.js:
	@browserify -s Offset src/offset.js > dist/offset.js;

dist/offset.only.js:
	@browserify -s Offset -u greiner-hormann src/offset.js > dist/offset.only.js;

sources: dist/offset.js dist/offset.only.js

compile: ${COMPILED}

%.min.js: %.js
	@echo " - $(<) -> $(@)";
	@curl --silent --show-error --data-urlencode "js_code@$(<)" --data-urlencode "js_externs@src/externs.js" \
     --data "${QS}&output_info=compiled_code" ${URL} -o $(@)
