from django.shortcuts import render

def landing(request):
    return render(request, "landing.html")

def resume(request):
    return render(request, "resume.html")
