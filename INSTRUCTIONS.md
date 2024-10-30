# Instructions

The following are instructions on how to use this application to share and
annotate bat recordings.

## Uploading Data

When you first login, got to the 'Recordings' tab to view two lists of recordings.
The first list is a list of recordings you have uploaded.
You can add new data by clicking the 'Upload+' button and choosing a local
file on your system.
A date and name are required for uploading new data.
Optional data can be added including location/ equipment and comments about the file

**Public** - using this checkbox will share the data with all other users
within the system

Once others have have made annotations on your own files that are public
you can view them by clicking on the name

## Others Shared Data

This second list of recording files include files that were made public
by other users or the system admin

This will allow you create annotations on other's files by
clicking on the **Name** field for the annotation file

## Annotation Editor

### Viewing Annotations

The annotation editor has two main views of the spectrogram from the recording:

**Main View** - This main view has the full annotation zoomed in and can be
dragged/panned using left click and can be zoomed using the mousewheel.
At the top of the screen are the current frequence and time for the mouse cursor.
On the upper right side of the area are buttons for adding/removing information

**Bat Icon** - turns on/off species annotations for any bounding boxes on the screen
**MS Icon** - will toggle millisecond text annotations to all boxes
**KHZ Icon** - will toggle frequency labels for each bounding box on the screen
**Grid Icon** - toggles gride display across the spectrogram
**Compressed Icon** - toggles on/off the compressed view for the spectrogram

### Interactions

**Clicking** - clicking inside of annotation will automatically select it.
It will become cyan in color and the annotation will be selected in either
the Sequence or Pulse list.

**Right Clicking** - Right clicking on an annotation will swap it into 'Edit Mode'
In 'Edit Mode' the annotation bounds can be modified by clicking on the corners
and dragging them around.

#### Full Spectrogram View

Below the main view is a thumbnail of the full spectrogram.  This view shows
the entire spectrogram.
The **yellow** bounding box is used to show the current location and zoom
level for the **Main View**.
Clicking on and dragging in the thumbnail view will pan and jump instanlty to
that area in the main view.

#### Sequence and Pulse Annotations

On the right side of the screen is a list of the Sequence and Pulse annotations.
These are tabbed views that can be switched between by clicking on the Tab Name.
Annotations can be selected by clicking on them.
When an annotation is selected it can be edited including the
species comments and other information.

**Sequence** - A Sequence annotation is typically used to group multiple pulses together
This can be drawn by clicking on the 'Add+' button and drawing a box around the pulses.
Once created it is shown at the top of the screen

**Pulse** - A Pulse annotation is an annotation around a single pulse in the system.
These have a fequency range as well a time range.
