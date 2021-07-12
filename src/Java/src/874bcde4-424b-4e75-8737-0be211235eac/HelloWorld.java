import java.util.Scanner;

class HelloWorld {
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);
        System.out.println("Hello World: ");

        // take input from the user
        int number = input.nextInt();

        System.out.println("Enter an integer: " + number);

        int number2 = input.nextInt();

        System.out.println("Enter an integer2: " + number2);

    }
}
