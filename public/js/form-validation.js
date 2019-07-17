function getContent(){
    //Transfer the copy from the WYSIWYG editor into a textarea so it submits with the form
    document.getElementById("copy-textarea").innerHTML = document.querySelector(".ql-editor").innerHTML;

    //Get all of the tags and reduce them to a single comma-separated string
    var tags = [].reduce.call(document.getElementsByClassName("tagit-label"),(a, b) => a + "," + b.textContent, "");

    //Add the tag for the content type (for Uberflip customizations where certain tags add labels to the content)
    var contentType;
    switch(document.forms["uf-form"]["category"].value) {
        case "258701": //The id of the form
            contentType = "ebook";
            break;
        case "258797":
            contentType = "case study";
            break;
        case "261075":
            contentType = "deck";
            break;
        case "258791":
            contentType = "report";
            break;
        default:
            contentType = "pdf";
    }

    //Pass reduced tag string to a hidden form field
    document.getElementById("tags").value = contentType + tags;
    
    var formFlag = true;
    var hub = document.forms["uf-form"]["hub"].value;
    var stream = document.forms["uf-form"]["docStream"].value;
    var title = document.forms["uf-form"]["title"].value;
    var slug = document.forms["uf-form"]["slug"].value;
    var author = document.forms["uf-form"]["author"].value;
    var category = document.forms["uf-form"]["category"].value;
    var copy = document.forms["uf-form"]["copy"].value;
    var meta = document.forms["uf-form"]["metaDes"].value;
    var pdf = document.forms["uf-form"]["upload-pdf"].value;
    var thumb = document.forms["uf-form"]["upload-thumb"].value;

    if (title == "") {
        document.querySelector("#title-alert").style.display = "block";
        console.log("Show title");
        formFlag = false;
    }

    if (!/^\/([a-z0-9\-]*)\/$/.test(slug)) {
        document.querySelector("#slug-alert").style.display = "block";
        formFlag = false;
    }

    if (category == "--") {
        document.querySelector("#category-alert").style.display = "block";
        formFlag = false;
    }

    if (copy == "<p><br></p>") {
        document.querySelector("#copy-alert").style.display = "block";
        formFlag = false;
    }

    if (meta == "") {
        document.querySelector("#meta-alert").style.display = "block";
        formFlag = false;
    }

    if (!/^.*(\.pdf)$/.test(pdf)) {
        document.querySelector("#pdf-alert").style.display = "block";
        formFlag = false;
    }

    if (!/^.*(\.)(png|jpg|jpeg)$/.test(thumb)) {
        document.querySelector("#thumb-alert").style.display = "block";
        formFlag = false;
    }

    if (!formFlag) {
        window.scrollTo(0, 0);
    }
    return formFlag;
}