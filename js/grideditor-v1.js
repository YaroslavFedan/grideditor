/**
 * Frontwise grid editor plugin.
 */
'use strict';

(function ($) {
    
var languages = {
  'Section settings' : 'Section settings',
  'Close' : 'Close',
  'Save changes' : 'Save changes'    
};    

$.fn.gridEditor = function( options ) {

    var self = this;
    var grideditor = self.data('grideditor');
    

    /** Methods **/
    
    if (arguments[0] == 'getHtml') {
        if (grideditor) {
            grideditor.deinit();
            var html = self.html();
            grideditor.init();
            return html;
        } else {
            return self.html();
        }
    } 
    
    /** Initialize plugin */

    self.each(function(baseIndex, baseElem) {
        baseElem = $(baseElem);
        
        // Wrap content if it is non-bootstrap
        if (baseElem.children().length && !baseElem.find('div.row').length) {
            var children = baseElem.children();
            var newRow = $('<div class="row"><div class="col-md-12"/></div>').appendTo(baseElem);
            newRow.find('.col-md-12').append(children);
        }

        var settings = $.extend({
            'new_row_layouts'   : [ // Column layouts for add row buttons
                                    [12],
                                    [6, 6],
                                    [4, 4, 4],
                                    [3, 3, 3, 3],
                                    [2, 2, 2, 2, 2, 2],
                                    [2, 8, 2],
                                    [4, 8],
                                    [8, 4]
                                ],
            'row_classes'       : [{ label: 'Example class', cssClass: 'example-class'}],
            'col_classes'       : [{ label: 'Example class', cssClass: 'example-class'}],
            'col_tools'         : [], /* Example:
                                        [ {
                                            title: 'Set background image',
                                            iconClass: 'glyphicon-picture',
                                            on: { click: function() {} }
                                        } ]
                                    */
            'row_tools'         : [],
            'custom_filter'     : '',
            'content_types'     : ['tinymce'],
            'valid_col_sizes'   : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
            'source_textarea'   : '',
            'elem_added'        : {cssClass: 'ge-content-add', content:'<span class="ge-content-add"><i class="glyphicon glyphicon-plus"></i></span>'},
            'headerSimpleModal' : 'Section settings'
        }, options);

        // Elems
        var canvas,
            mainControls,
            addRowGroup,
            htmlTextArea
        ;
        var colClasses = ['col-md-', 'col-sm-', 'col-xs-'];
        var curColClassIndex = 0; // Index of the column class we are manipulating currently
        var MAX_COL_SIZE = 12;
        
        var editor = getRTE(settings.content_types);
        

        setup();
        init();

        function setup() {
            /* Setup canvas */
            canvas = baseElem.addClass('ge-canvas');

            if (settings.source_textarea) {
                var sourceEl = $(settings.source_textarea);
                
                sourceEl.addClass('ge-html-output');
                    htmlTextArea = sourceEl;
                    
                if (sourceEl.val()) {
                    self.html(sourceEl.val());
                }
            }
            
            if (typeof htmlTextArea === 'undefined' || !htmlTextArea.length) {
                htmlTextArea = $('<textarea class="ge-html-output"/>').insertBefore(canvas);
            }

            /* Create main controls*/
            mainControls = $('<div class="ge-mainControls" />').insertBefore(htmlTextArea);
            var wrapper = $('<div class="ge-wrapper ge-top" />').appendTo(mainControls);

            // Add row
            addRowGroup = $('<div class="ge-addRowGroup btn-group" />').appendTo(wrapper);
            $.each(settings.new_row_layouts, function(j, layout) {
                var btn = $('<a class="btn btn-xs btn-primary" />')
                    .attr('title', 'Add row ' + layout.join('-'))
                    .on('click', function() {
                        var row = createRow().appendTo(canvas);
                        layout.forEach(function(i) {
                            createColumn(i).appendTo(row);
                        });
                        init();
                    })
                    .appendTo(addRowGroup)
                ;

                btn.append('<span class="glyphicon glyphicon-plus-sign"/>');

                var layoutName = layout.join(' - ');
                var icon = '<div class="row ge-row-icon">';
                layout.forEach(function(i) {
                    icon += '<div class="column col-xs-' + i + '"/>';
                });
                icon += '</div>';
                btn.append(icon);
            });

            // Buttons on right
            var layoutDropdown = $('<div class="dropdown pull-right ge-layout-mode">' +
                '<button type="button" class="btn btn-xs btn-primary dropdown-toggle" data-toggle="dropdown"><span>Desktop</span></button>' +
                '<ul class="dropdown-menu" role="menu">' +
                    '<li><a data-width="auto" title="Desktop"><span>Desktop</span></a></li>' +
                    '<li><a title="Tablet"><span>Tablet</span></li>' +
                    '<li><a title="Phone"><span>Phone</span></a></li>' +
                    '</ul>' +
                '</div>')
                .on('click', 'a', function() {
                    var a = $(this);
                    switchLayout(a.closest('li').index());
                    var btn = layoutDropdown.find('button');
                    btn.find('span').remove();
                    btn.append(a.find('span').clone());
                })
                .appendTo(wrapper)
            ;
            var btnGroup = $('<div class="btn-group pull-right"/>')
                .appendTo(wrapper)
            ;
//            var controlButton = $('<button title="Hide Tools" type="button" class="btn btn-xs btn-primary"><span class="glyphicon glyphicon-wrench"></span></button>')
//            .on('click', function(){
//                if (controlButton.hasClass('active')) {
//                    
//                    $('.ge-tools-drawer').show();
//                }else{
//                    $('.ge-tools-drawer').hide();
//                }
//                controlButton.toggleClass('active btn-danger');
//            })
//            .appendTo(btnGroup)
//            ;
            var htmlButton = $('<button title="Edit Source Code" type="button" class="btn btn-xs btn-primary gm-edit-mode"><span class="glyphicon glyphicon-chevron-left"></span><span class="glyphicon glyphicon-chevron-right"></span></button>')
                .on('click', function() {
                    if (htmlButton.hasClass('active')) {
                        canvas.empty().html(htmlTextArea.val()).show();
                        init();
                        htmlTextArea.hide();
                    } else {
                        deinit();
                        htmlTextArea
                            .height(0.8 * $(window).height())
                            .val(canvas.html())
                            .show()
                        ;
                        canvas.hide();
                    }

                    htmlButton.toggleClass('active btn-danger');
                })
                .appendTo(btnGroup)
            ;
            var previewButton = $('<button title="Preview" type="button" class="btn btn-xs btn-primary gm-preview"><span class="glyphicon glyphicon-eye-open"></span></button>')
                .on('mouseenter', function() {
                    canvas.removeClass('ge-editing');
                })
                .on('click', function() {
                    previewButton.toggleClass('active btn-danger').trigger('mouseleave');
                })
                .on('mouseleave', function() {
                    if (!previewButton.hasClass('active')) {
                        canvas.addClass('ge-editing');
                    }
                })
                .appendTo(btnGroup)
            ;

            // Make controls fixed on scroll
            var $window = $(window);
            $window.on('scroll', function(e) {
                if (
                    $window.scrollTop() > mainControls.offset().top &&
                    $window.scrollTop() < canvas.offset().top + canvas.height()
                ) {
                    if (wrapper.hasClass('ge-top')) {
                        wrapper
                            .css({
                                left: wrapper.offset().left,
                                width: wrapper.outerWidth(),
                            })
                            .removeClass('ge-top')
                            .addClass('ge-fixed')
                        ;
                    }
                } else {
                    if (wrapper.hasClass('ge-fixed')) {
                        wrapper
                            .css({ left: '', width: '' })
                            .removeClass('ge-fixed')
                            .addClass('ge-top')
                        ;
                    }
                }
            });

            /* 
            canvas.on('click', '.ui-sortable', function(e) {
                /*var rte = getRTE($(this).data('ge-content-type'));
                if (rte) {
                    rte.init(settings, $(this));
                }
                console.log($(this));
            });
           */
//            canvas.on('click', '.ui-sortable', function(e) {
//                console.log($(this));
//            });
        }

        function reset() {
            deinit();
            init();
        }

        function init() {
            runFilter(true);
            canvas.addClass('ge-editing');
            addAllColClasses();
            wrapContent();
            createRowControls();
            createColControls();
            makeSortable();
            switchLayout(curColClassIndex);
            /****/
            $('[data-toggle="tooltip"]').tooltip();
            
           
        }

        function deinit() {
            canvas.removeClass('ge-editing');
            var contents = canvas.find('.ge-content').each(function() {
                var content = $(this);
               // getRTE(content.data('ge-content-type')).deinit(settings, content);
            });
            canvas.find('.ge-tools-drawer').remove();
            removeSortable();
            runFilter();
        }

        function createRowControls() {
            canvas.find('.row').each(function() {
                var row = $(this);
                if (row.find('> .ge-tools-drawer').length) { return; }

                var drawer = $('<div class="ge-tools-drawer" />').prependTo(row);
                createTool(drawer, 'Переместить', 'ge-move', 'glyphicon-move');
                createTool(drawer, 'Настройки', 'setting', 'glyphicon-cog', function() {
                    
                    var curRow = $(this).parent().parent();
                    canvas.find('.ge-setting').removeClass('ge-setting');
                    curRow.addClass('ge-setting');
                    
                    var params = {
                        'id' : 'modalConfig',
                        'items' : ['positionEdit', 'border', "backgroundColor", "backgroundImage", "backgroundSize"],
                        'buttons' : [
                            { 'btn' : '<button type="button" class="btn btn-default" id="closeModal" data-dismiss="modal">Close</button>' }, 
                            { 'btn' : '<button type="button" id="saveChanges" class="btn btn-primary">Save changes</button>' }
                         ],
                         attributes : {
                            'title' : 'Title',
                            'formId' : 'cssForm',
                            //'size' : 'modal-lg'
                        }
                    }
                    
                    htmlManipulationElements( params );
                });
                settings.row_tools.forEach(function(t) {
                    createTool(drawer, t.title || '', t.className || '', t.iconClass || 'glyphicon-wrench', t.on);
                });
                

                 createTool(drawer, 'Добавить колонку', 'ge-add-column', 'glyphicon glyphicon-th', function() {
                    row.append(createColumn(3));
                    init();
                });
                
                createTool(drawer, 'Добавить елемент', 'ge-put-column', 'glyphicon-plus-sign', function() {
                  
                    //addItemToElement();
                    //console.log(getModal('getContent'));
                    alert('not isset function');
                });
                
                createTool(drawer, 'Удалить ряд', 'ge-remove', 'glyphicon-trash', function() {
                    row.slideUp(function() {
                        row.remove();
                    });
                });
                var details = createDetails(row, settings.row_classes).appendTo(drawer);
            });
        }

        function createColControls() {
            canvas.find('.column').each(function() {
                var col = $(this);
                if (col.find('> .ge-tools-drawer').length) { return; }

                var drawer = $('<div class="ge-tools-drawer" />').prependTo(col);

                createTool(drawer, 'Переместить', 'ge-move', 'glyphicon-move');

                createTool(drawer, 'Уменьшить колонку (удерживайте Shift что бы сделать минимальной)', 'ge-decrease-col-width', 'glyphicon-minus', function(e) {
                    var colSizes = settings.valid_col_sizes;
                    var curColClass = colClasses[curColClassIndex];
                    var curColSizeIndex = colSizes.indexOf(getColSize(col, curColClass));
                    var newSize = colSizes[clamp(curColSizeIndex - 1, 0, colSizes.length - 1)];
                    if (e.shiftKey) {
                        newSize = colSizes[0];
                    }
                    setColSize(col, curColClass, Math.max(newSize, 1));
                });

                createTool(drawer, 'Увеличить колонку (удерживайте Shift что бы сделать максимальной)', 'ge-increase-col-width', 'glyphicon-plus', function(e) {
                    var colSizes = settings.valid_col_sizes;
                    var curColClass = colClasses[curColClassIndex];
                    var curColSizeIndex = colSizes.indexOf(getColSize(col, curColClass));
                    var newColSizeIndex = clamp(curColSizeIndex + 1, 0, colSizes.length - 1);
                    var newSize = colSizes[newColSizeIndex];
                    if (e.shiftKey) {
                        newSize = colSizes[colSizes.length - 1];
                    }
                    setColSize(col, curColClass, Math.min(newSize, MAX_COL_SIZE));
                });

                createTool(drawer, 'Настройки', 'setting-div', 'glyphicon-cog', function() {
                    var curCol = $(this).parent().parent();

                    canvas.find('.ge-setting').removeClass('ge-setting');
                    curCol.addClass('ge-setting');
                    
                     var params = {
                        'id' : 'modalConfig',
                        'items' : ['positionEdit', 'border', "backgroundColor", "backgroundImage", "backgroundSize"],
                        'buttons' : [
                            { 'btn' : '<button type="button" class="btn btn-default" id="closeModal" data-dismiss="modal">Close</button>' }, 
                            { 'btn' : '<button type="button" id="saveChanges" class="btn btn-primary">Save changes</button>' }
                         ],
                         attributes : {
                            'title' : 'Title',
                            'formId' : 'cssForm',
                            //'size' : 'modal-lg'
                        }
                    }
                    
                    htmlManipulationElements(params);
                });
                
                settings.col_tools.forEach(function(t) {
                    createTool(drawer, t.title || '', t.className || '', t.iconClass || 'glyphicon-wrench', t.on);
                });
                createTool(drawer, 'Добавить ряд', 'ge-add-row', 'glyphicon glyphicon-th', function() {
                    var row = createRow();
                    col.append(row);
                    row.append(createColumn(6)).append(createColumn(6));
                    init();
                });
                createTool(drawer, 'Добавить елемент', 'ge-put-column', 'glyphicon-plus-sign', function() {
                    
                    var curCol = $(this).parent().parent();
                    canvas.find('.ge-setting').removeClass('ge-setting');
                    curCol.addClass('ge-setting');
    
                     var params = {
                        'id' : 'modalElem',
                        'items' : ['LinkTE'],
                        'buttons' : [{ 'btn' : '<button type="button" class="btn btn-default" id="closeModal" data-dismiss="modal">Close</button>' }],
                         attributes : {'title' : 'Title','size':'modal-lg'}
                    }

                    setModal(params);
                });
                createTool(drawer, 'Удалить колонку', 'ge-remove', 'glyphicon-trash', function() {
                    col.animate({
                        opacity: 'hide',
                        width: 'hide',
                        height: 'hide'
                    }, 400, function() {
                        col.remove();
                    });
                });

                

                var details = createDetails(col, settings.col_classes).appendTo(drawer);
            });
        }

        function createTool(drawer, title, className, iconClass, eventHandlers) {
            var tool = $('<a title="' + title + '" class="' + className  + '" data-toggle="tooltip" rel="rel"><span class="glyphicon ' + iconClass + '"></span></a>')
                .appendTo(drawer)
            ;
            if (typeof eventHandlers == 'function') {
                tool.on('click', eventHandlers);
            }
            if (typeof eventHandlers == 'object') {
                $.each(eventHandlers, function(name, func) {
                    tool.on(name, func);
                });
            }
        }

        function createDetails(container, cssClasses) {
            var detailsDiv = $('<div class="ge-details" />');

            $('<input class="ge-id" />')
                .attr('placeholder', 'id')
                .val(container.attr('id'))
                .attr('title', 'Set a unique identifier')
                .appendTo(detailsDiv)
            ;

            var classGroup = $('<div class="btn-group" />').appendTo(detailsDiv);
            cssClasses.forEach(function(rowClass) {
                var btn = $('<a class="btn btn-xs btn-default" />')
                    .html(rowClass.label)
                    .attr('title', rowClass.title ? rowClass.title : 'Toggle "' + rowClass.label + '" styling')
                    .toggleClass('active btn-primary', container.hasClass(rowClass.cssClass))
                    .on('click', function() {
                        btn.toggleClass('active btn-primary');
                        container.toggleClass(rowClass.cssClass, btn.hasClass('active'));
                    })
                    .appendTo(classGroup)
                ;
            });

            return detailsDiv;
        }

        function addAllColClasses() {
            canvas.find('.column, div[class*="col-"]').each(function() {
                var col = $(this);

                var size = 2;
                var sizes = getColSizes(col);
                if (sizes.length) {
                    size = sizes[0].size;
                }

                var elemClass = col.attr('class');
                colClasses.forEach(function(colClass) {
                    if (elemClass.indexOf(colClass) == -1) {
                        
                        console.log(size);
                        col.addClass(colClass + size);
                    }
                });

                col.addClass('column');
            });
        }

        /**
         * Return the column size for colClass, or a size from a different
         * class if it was not found.
         * Returns null if no size whatsoever was found.
         */
        function getColSize(col, colClass) {

            var sizes = getColSizes(col);
            for (var i = 0; i < sizes.length; i++) {
                if (sizes[i].colClass == colClass) {
                    return sizes[i].size;
                }
            }
            if (sizes.length) {
                return sizes[0].size;
            }
            return null;
        }

        function getColSizes(col) {
            var result = [];
            colClasses.forEach(function(colClass) {
                var re = new RegExp(colClass + '(\\d+)', 'i');
                if (re.test(col.attr('class'))) {
                    result.push({
                        colClass: colClass,
                        size: parseInt(re.exec(col.attr('class'))[1])
                    });
                }
            });
            return result;
        }

        function setColSize(col, colClass, size) {
            var re = new RegExp('(' + colClass + '(\\d+))', 'i');
            var reResult = re.exec(col.attr('class'));
            if (reResult && parseInt(reResult[2]) !== size) {
                col.switchClass(reResult[1], colClass + size, 50);
            } else {
                col.addClass(colClass + size);
            }
        }

        function makeSortable() {
            canvas.find('.row').sortable({
                items: '> .column',
                connectWith: '.ge-canvas .row',
                handle: '> .ge-tools-drawer .ge-move',
                start: sortStart,
                helper: 'clone',
            });
            canvas.add(canvas.find('.column')).sortable({
                items: '> .row, > .ge-content',
                connectsWith: '.ge-canvas, .ge-canvas .column',
                handle: '> .ge-tools-drawer .ge-move',
                start: sortStart,
                helper: 'clone',
            });

            function sortStart(e, ui) {
                ui.placeholder.css({ height: ui.item.outerHeight()});
            }
        }

        function removeSortable() {
            canvas.add(canvas.find('.column')).add(canvas.find('.row')).sortable('destroy');
        }

        function createRow() {
            return $('<div class="row" />');
        }

        function createColumn(size) {
            return $('<div/>')
                .addClass(colClasses.map(function(c) { return c + size; }).join(' '))
                .append(createDefaultContentWrapper().html(
                   // getRTE(settings.content_types[0]).initialContent
            
                    )
                )
            ;
        }

        /**
         * Run custom content filter on init and deinit
         */
        function runFilter(isInit) {
            if (settings.custom_filter.length) {
                $.each(settings.custom_filter, function(key, func) {
                    if (typeof func == 'string') {
                        func = window[func];
                    }

                    func(canvas, isInit);
                });
            }
        }

        /**
         * Wrap column content in <div class="ge-content"> where neccesary
         */
        function wrapContent() {
            canvas.find('.column').each(function() {
                var col = $(this);
                var contents = $();
                col.children().each(function() {
                    var child = $(this);
                    if (child.is('.row, .ge-tools-drawer, .ge-content')) {
                        doWrap(contents);
                    } else {
                        contents = contents.add(child);
                    }
                });
                doWrap(contents);
            });
        }
        function doWrap(contents) {
            if (contents.length) {
                var container = createDefaultContentWrapper().insertAfter(contents.last());
                contents.appendTo(container);
                contents = $();
            }
        }

        function createDefaultContentWrapper() {
            return $('<div/>')
                .addClass('ge-content ge-content-type-' + settings.content_types[0])
                .attr('data-ge-content-type', settings.content_types[0])
            ;
        }

        function switchLayout(colClassIndex) {
            curColClassIndex = colClassIndex;

            var layoutClasses = ['ge-layout-desktop', 'ge-layout-tablet', 'ge-layout-phone'];
            layoutClasses.forEach(function(cssClass, i) {
                canvas.toggleClass(cssClass, i == colClassIndex);
            });
        }
         
        function clamp(input, min, max) {
            return Math.min(max, Math.max(min, input));
        }

        baseElem.data('grideditor', {
            init: init,
            deinit: deinit,
        });
        
        
    
        
        /**  Редактирование колонки, ряда. **/ 
        function htmlManipulationElements( params ){

            setModal( params );
            setStyleAttributes(params.id);

            $('#saveChanges').on('click', function(){
               
                var $inputs = $('#'+params.attributes.formId+' :input');
                var styleAttributes = {};
                var classAttributes = {};
                var indexAttribute = '';
                
                $inputs.each(function() {
                    if($(this).val() != ''){
                        styleAttributes[this.name] = $(this).val();
                    }
                    
                    $(this).val("");
                });

                getStyleAttributes( styleAttributes );
                removeModal( params.id ); 
            });    
        }
        
       
         /**** TESTING ****/
        function testModal()
        {
            var modal = getTemplate('../template/modal-test.html');
            
            $('body').append(modal);
            
            $('#modalConfig').init();
            $('#modalConfig').modal({backdrop: 'static', keyboard: false});  
            $('#modalConfig').modal('show');
            
            $('#modalConfig').on('click','.well', function(){
                console.log($(this).attr('data-content'));
                removeModal( 'modalConfig' ); 
            })
        }
        
        
        function getTemplate(url)
        {
            var res = $.ajax({ type: "GET",   
                        url: url,   
                        async: false
                      }).responseText; 
            return res;
        }
        /**** END TESTING ****/
       
        
       
        
        /** берем стили у елемента, присваивает значения форме в модальном окне **/
        function setStyleAttributes(modalID)
        {
            var curElem = canvas.find('.ge-setting');
 
            $(curElem[0].attributes).each(function(key, value) {
                
                if( this.nodeName == "style"){
                    var attr = this.nodeValue.split(';');
                    var param = '';
                    $.each(attr, function(k, v){ 
                        if(v != '')param = v.split(':');
                        
                        $('#cssForm').find('input, select').each(function(){
                        
                            var style_array = false;
                            
                            if(param[0] === $(this).attr('name')){

                                switch($.trim(param[0])){
                                    case "border-top" :
                                    case "border-right" :
                                    case "border-bottom" :
                                    case "border-left" :
                                        var border_val_array =  param[1].split(' ');
                                        var px_border_val = parseFloat(border_val_array[0]);
                                        $('#cssForm').find('input[name="'+param[0]+'"]').val(px_border_val);
                                        if(!style_array){
                                            style_array = border_val_array[1].split('#');
                                            $('#cssForm').find('input[name="border-color"]').val(style_array[1]);
                                            $('#cssForm').find('select[name="border-style"]').val(style_array[0]).attr("selected",'selected');
                                        } 
                                        break;
                                    case "background-image" :
                                        var http_arr = param[1].split('url(');
                                        var http_protocol = $.trim(http_arr[1]);
                                        var path_array = param[2].split(')');
                                        var path = $.trim(path_array[0]);  
                                        $('#cssForm').find('#img_bg').attr('src',http_protocol+":"+path).show().after('<a href="#" class="rm-bg-img"><i class="glyphicon glyphicon-remove"></i></a>');
                                        $('#cssForm').find('input[name="background-image"]').val(http_protocol+":"+path).addClass('form-control').css({'display':'block'}); 
                                        break;
                                    case "background-color" :
                                        $('#cssForm').find('input[name="'+param[0]+'"]').val(param[1].slice(1)); 
                                        break;
                                    case "background-size" :
                                        $('#cssForm').find('select[name="background-size"]').val(param[1]).attr("selected",'selected');
                                        break;
                                    default :
                                        $('#cssForm').find('input[name="'+param[0]+'"]').val( parseFloat(param[1]) ); 
                                }
                            }
                        });
                    });
                }
            });  
        }
        
        
        /** получаем из формы в модальном окне стили и присваивает елементу **/
        function getStyleAttributes( values ) {
        
            var styles = '';
            var s = "solid";
            var c = "#000";

            if(typeof values['border-style'] !== typeof undefined){
                s = values['border-style']; 
                delete values['border-style'];
            }
           
            if(typeof values['border-color'] !== typeof undefined){
                c = "#" + values['border-color']; 
                delete values['border-color'];
            }
    
            $.each( values, function( key, value ) { 

                 switch(key){
                    case "border-top" :
                    case "border-right" :
                    case "border-bottom" :
                    case "border-left" :
                        styles += key + ":" + value + 'px ' + s + c + ';'; 
                        break;
                     case "background-image" :
                         styles +=  key + ":url( " + value + ");";
                         break;
                     case "background-color" :
                         styles +=  key + ":#" + value + ";";
                         break;
                     case "background-size" :
                          styles +=  key + ":" + value + ";";
                         break;
                     default :
                          styles +=   key + ":" + value + "px;";
                  }
           });
           
           canvas.find('.ge-setting').attr('style',styles);
        
        }
          
        
         $(document).on('click', '.ge-add-con', function(e){
             
             var modalId = $('.modal').attr('id');
             var selected = $(this).attr('data-content');
             
              switch(selected){
                    case 'textEditor':
                          var params = {
                            'id' : selected,
                            'items' : [selected],
                            'buttons' : [
                                        { 'btn' : '<button type="button" class="btn btn-default" id="closeModal" data-dismiss="modal">Close</button>' },
                                        { 'btn' : '<button type="button" id="saveChanges" class="btn btn-primary">Save changes</button>' }],
                             attributes : {'title' : selected,'size':'modal-lg'}
                        }
                          
                        $(document).on('click', '#saveChanges', function(e){
                            editor.put(canvas.find('.ge-setting'));
                            removeModal(selected);
                        })
                        
                    break;
              }

            removeModal(modalId);
            setModal(params);
        });
        
        
    
        function setModal( params ){
            
            if(typeof params.id === typeof undefined ){
                params.id = 'defaultModal';
             }

            var modal = generateModal( params );
            
            $('body').append(modal);
            
            $('#'+params.id).init();
            $('#'+params.id).modal({backdrop: 'static', keyboard: false});  
            $('#'+params.id).modal('show');

            
            switch(params.id){
                 case 'modalConfig':
                     $(".pick-a-color").pickAColor({allowBlank   : true}); 
                 break;   
                 case 'textEditor':
                    editor.deinit();
                    editor.init('',canvas.find('.ge-setting'));   
                 break;
             } 
        }
        
        
        
        function generateModal(params)
        {
            var html = '';
            var modalContent = '';
            var items  = getModal('items');
            var footer = '';
            
            if(typeof params.attributes.size === typeof undefined){
                 params.attributes.size = '';
            }
            if(typeof params.attributes.title !== typeof undefined){
                  params.attributes.title = '<div class="modal-header"><h4 class="modal-title">'+params.attributes.title+'</h4></div>';
            }else{
                params.attributes.title = '';
            }
            if(typeof params.attributes.formId === typeof undefined){
                 params.attributes.formId = 'defaultForm';
            }
            if(params.items.length != 0){
                for(var i = 0; i < params.items.length; i++){
                    modalContent += items[params.items[i]];

                }
            }
            if(params.buttons.length != 0){
                footer += '<div class="modal-footer">';
                for(var i = 0; i < params.buttons.length; i++){
                   footer += params.buttons[i].btn;
                }
                 footer += '</div>';
            }
    
            html = '<div class="modal fade" id="'+params.id+'" tabindex="-1" role="dialog">'+
                    '<div class="modal-dialog '+params.attributes.size+'" role="document">'+
                        '<div class="modal-content">'+ params.attributes.title +
                            '<div class="modal-body">'+
                                '<div id="editor-css">' + 
                                    '<div class="style row">' +
                                        '<form role="form" id="'+params.attributes.formId+'" class="tab-content">'+
                                            modalContent+
                                        '</form>'+
                                    '</div>'+
                                '</div>'+
                                footer+
                            '</div>'+
                        '</div>'+
                    '</div>'+
                  '</div>';
            
            return html;
            
        }
        
        function getModal(type) {
            return $.fn.gridEditor.Modal[type];
        }
        
        function getRTE(type) {
            return $.fn.gridEditor.RTEs[type];
        }
        
        
        $(document).on('click', '.modal #closeModal', function(){
            var modalId = $('.modal').attr('id');
            removeModal(modalId);
        });
        
        function removeModal(id){
            var modalWindow = document.getElementById(id);

            if(modalWindow !== null) 
                modalWindow.remove(); 
            $(".modal-backdrop").remove();
        }
        
        
        /*** filemanager ***/
       $( document ).on( "click", '#open_popup', function(){
             var url = "/lib/filemanager/dialog.php?type=1&popup=1&field_id=img_bg&lang=ru";
             window.open(url, '', 'location,status=0, toolbar=0, location=0, menubar=0, width=800,height=600,directories=0, resizable=1, scrollbars=0top=0');
       });
        window.responsive_filemanager_callback = function(field_id){
            var bgImg = $('img#img_bg');
            var inImg = $("input[name='background-image']");
            var url=jQuery('#'+field_id).val();
            bgImg.attr('src',url).css({'display':'block'});
            inImg.addClass('form-control').css({'display':'block'});
            bgImg.after('<a href="#" class="rm-bg-img"><i class="glyphicon glyphicon-remove"></i></a>');
            inImg.val(url);
        }
       $( document ).on( "click", '.rm-bg-img', function(e){
           var bgImg = $('img#img_bg');
           var inImg = $("input[name='background-image']");
           inImg.val('').css({'display':'none'});
           bgImg.attr('src','').css({'display':'none'});
           $('.rm-bg-img').remove();
           e.preventDefault();
       })
       /*** end filemanager ***/
  

    });

    return self;

};

$.fn.gridEditor.RTEs = {};

$.fn.gridEditor.Modal = {
        'items':{
            'positionEdit':'<div class="layout col-sm-12">'+
                    '<div class="margin"><label>Margin</label>'+
                    '<input name="margin-top" type="text" placeholder="-" value="">'+
                    '<input name="margin-bottom" type="text" placeholder="-" value="">'+
                    '<input name="margin-left" type="text" placeholder="-" value="">'+
                    '<input name="margin-right" type="text" placeholder="-" value="">'+
                    '<div class="border">'+
                        '<label>Border</label>'+
                            '<input name="border-top" type="text" placeholder="-" value="">'+
                            '<input name="border-bottom" type="text" placeholder="-" value="">'+
                            '<input name="border-left" type="text" placeholder="-" value="">'+
                            '<input name="border-right" type="text" placeholder="-" value="">'+
                                '<div class="padding">'+
                                    '<label>Padding</label>'+
                                        '<input name="padding-top" type="text" placeholder="-" value="">'+
                                        '<input name="padding-bottom" type="text" placeholder="-" value="">'+
                                        '<input name="padding-left" type="text" placeholder="-" value="">'+
                                        '<input name="padding-right" type="text" placeholder="-" value="">'+
                                        '<div class="content"> </div>'+
                                '</div>'+
                            '</div>'+
                        '</div>'+
                    '</div>',
            'border':'<div class=" col-sm-12">'+
                         '<div class="form form-group">'+
                            '<label>Border color</label>'+
                                '<input type="text" name="border-color" class="pick-a-color form-control" value="">'+
                            '<label>Border style</label>'+
                            '<select name="border-style" class="form-control">'+
                                '<option selected="selected" value=""></option>'+
                                '<option  value="solid">Solid</option>'+
                                '<option value="dotted">Dotted</option>'+
                                '<option value="dashed">Dashed</option>'+
                                '<option value="none">None</option>'+
                                '<option value="hidden">Hidden</option>'+
                                '<option value="double">Double</option>'+
                                '<option value="groove">Groove</option>'+
                                '<option value="ridge">Ridge</option>'+
                                '<option value="inset">Inset</option>'+
                                '<option value="outset">Outset</option>'+
                                '<option value="initial">Initial</option>'+
                                '<option value="inherit">Inherit</option>'+
                            '</select>'+
                        '</div>'+
                      '</div>',
            'backgroundColor':'<div class=" col-sm-12">'+
                                    '<div class="form form-group">'+
                                        '<label>Background color</label>'+
                                            '<input type="text" name="background-color" class="pick-a-color form-control" value="">'+
                                    '</div>'+
                                '</div>',
            'backgroundImage':'<div class="col-sm-12">'+'<div class="input-append bg-image">'+
                                    '<label>Background image</label><br>'+
                                    '<div class="col-xs-8 no-padding-left"><a href="#" id="open_popup" class="btn btn-default glyphicon glyphicon-picture" type="button"></a>'+
                                    '<input hidden="" type="text" name="background-image" value="">'+
                                    '</div>'+
                                    '<div class="col-xs-4"><img src="" hidden=""  id="img_bg" alt=""></div></div></div>',
            'backgroundSize': '<div class=" col-sm-12">'+
                            '<div class="form form-group">'+
                                '<label>Background size</label>'+
                                '<select name="background-size" class="form-control" style="margin-top:15px;">'+
                                    '<option  selected="selected"  value=""></option>'+
                                    '<option value="cover">Cover</option>'+
                                    '<option value="contain">Contain</option>'+
                                    '<option value="no-repeat">No Repeat</option>'+
                                    '<option value="repeat">Repeat</option>'+
                                    '<option value="repeat-x">Horizontal repeat bottom</option>'+
                                '</select>'+
                            '</div>'+
                      '</div>',
            'LinkTE': '<div class="col-xs-3">'+
                            '<div class="well ge-add-con text-center text-overflow" data-content="textEditor" style="height: 130px;">'+
                                '<i class="text-primary fa fa-list-alt" style="font-size: 40px;"></i>'+
                                '<div>Text</div>'+
                                '<div class="text-muted small">A block of text with WYSIWYG editor</div>'+
                            '</div>'+
                    '</div>',
            'linkFileManager':'<div class="col-xs-3">'+
                                '<div class="well text-center text-overflow" data-content="imageEditor"  style="height: 130px;">'+
                                    '<i class="text-primary fa fa-picture-o" style="font-size: 40px;"></i>'+
                                    '<div>Image</div>'+
                                    '<div class="text-muted small">Single image</div>'+
                                '</div>'+
                            '</div>',
            'textEditor' : ' <div class="col-xs-12"><textarea id="editor-text">Easy (and free!) You should check out our premium features.</textarea></div>',
            
            
        },
        
};
    

})( jQuery );



(function() {
    $.fn.gridEditor.RTEs.tinymce = {
        init: function(settings, contentAreas) { 
            var tinyMCE = window.tinymce;
            if (!tinyMCE) {
                console.log('tinyMCE not available! Make sure you loaded the tinyMCE js file.');
            }
            var self = this;

            tinyMCE.init({
                selector: "#editor-text",
                theme: "modern",
                width: '100%',
                height: 300, 
                menubar: false,
                plugins: [
                     "advlist autolink link image lists charmap print preview hr anchor pagebreak",
                     "searchreplace wordcount visualblocks visualchars insertdatetime media nonbreaking",
                     "table contextmenu directionality emoticons paste textcolor filemanager code"
                   ],
                toolbar1: "undo redo | bold italic underline | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | styleselect",
                toolbar2: "| filemanager | link unlink anchor | image media | forecolor backcolor  | print preview code ",
                image_advtab: true ,
                external_filemanager_path: "/lib/filemanager/",
                filemanager_title:"Responsive Filemanager" ,
                external_plugins: { "filemanager" : "/lib/tinymce/plugins/filemanager/plugin.min.js"},
                init_instance_callback : function(editor) {
                    
                    var content = contentAreas.find('.ge-content');
                    if(typeof content.html() === typeof undefined){
                        editor.setContent( self.initialContent );
                    }else{
                        editor.setContent( contentAreas.find('.ge-content').html() );

                    }
                }
           });
        },
        put: function(contentAreas) { 
            var editorContent = tinyMCE.activeEditor.getContent(); 
            var content = contentAreas.find('.ge-content');
 
            if(typeof content.html() !== typeof undefined){ 
                 content.remove();
            }
            contentAreas.append('<div class="ge-content">'+editorContent+'</div>');
            
        },
        deinit: function(settings, contentAreas) {   
            if (!tinyMCE) {
                console.log('tinyMCE not available! Make sure you loaded the tinyMCE js file.');
            }else{
                 console.log( tinyMCE );
            }
            tinyMCE.remove();  
        },
        initialContent: '<p>Lorem ipsum dolores</p>',
    };
})();
